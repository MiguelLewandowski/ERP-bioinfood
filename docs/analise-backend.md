# Análise Backend — ERP Bioinfood

> Revisão de arquitetura do backend NestJS sob a ótica de **Tech Lead / Engenheiro Backend Sênior**, com foco em **separação de responsabilidades**, **desacoplamento**, **RBAC** e **prontidão para escala**.
>
> **Data:** 2026-07-17 (3ª passagem) · **Escopo:** `apps/api/src` (17 módulos, 271 arquivos) · **Estado:** onda CRM entregue — `organizations`, `contacts`, `interactions`, `opportunities`, `pipelines`, `taxonomies`, `crm-activities`, `stakeholders` somam-se ao núcleo de projetos.

---

## 1. Resumo

A onda CRM entrou com **qualidade visivelmente superior à do núcleo antigo**: mapper de saída em todos os módulos novos, `@Roles` no nível da classe, escrita restrita a ADMIN, validação de posse de sub-recurso pelo pai e testes de use-case. O backend agora tem **dois padrões convivendo** — o novo (correto) e o antigo de `tasks` (com IDOR e leitura cross-project ainda abertos).

O achado que domina esta passagem é novo e **crítico**: `process.env.JWT_SECRET ?? 'secret'` em dois pontos. Se a env faltar em produção, a API assina e valida tokens com um segredo literal público — **qualquer um forja um token ADMIN**, e nada falha no startup. Isso transforma o antigo A3 (env sem validação) de higiene em risco de comprometimento total.

---

## 2. Pontos fortes a preservar

- ✅ **A onda CRM é o novo padrão de referência.** `update-contact-link.use-case.ts:11` (`findLink(contactId, linkId)`) e `manage-stages.use-case.ts:16,30` (`findStage(pipelineId, stageId)`) resolvem o sub-recurso **escopado pelo pai** — exatamente o que A1/A2 pedem. Replicar em `tasks`.
- ✅ **Mapper de saída agora é regra nos módulos novos** (`organization.mapper`, `contact.mapper`, `interaction.mapper`, `opportunity.mapper`, `pipeline.mapper`, `crm-activity.mapper`). A5 deixou de ser sistêmico e virou dívida localizada no núcleo antigo.
- ✅ **RBAC declarado na classe** (`organizations.controller.ts:32`, `contacts.controller.ts:27`, `interactions.controller.ts:21`): CLIENTE fica de fora do CRM **por construção**, não por esquecimento rota a rota.
- ✅ **Três guards globais via `APP_GUARD`** (`app.module.ts:52-54`) — todo controller novo nasce autenticado e com gating de CLIENTE.
- ✅ **Invariantes de domínio com teste** — 17 spec files; `manage-stages.use-case.ts:52` protege "ao menos uma etapa OPEN ativa"; `opportunity.rules.spec.ts` cobre o funil.
- ✅ **`take` em todas as listagens** e `SELECT` explícito nos repositórios do CRM (nada de `passwordHash` vazando).

---

## 3. Achados por severidade

### 🔴 Crítico

**B1 — `JWT_SECRET` com fallback hardcoded `'secret'` → forja de token ADMIN se a env faltar** *(novo; agrava A3)*
`auth.module.ts:21` (`secret: process.env.JWT_SECRET ?? 'secret'`) e `jwt.strategy.ts:12` (`secretOrKey: process.env.JWT_SECRET ?? 'secret'`).
Os dois lados — quem assina e quem valida — caem no mesmo literal. Se `JWT_SECRET` não estiver setada no Railway (typo, env nova, serviço recriado), a aplicação **sobe normalmente** e passa a aceitar qualquer JWT assinado com a string `'secret'`. Um atacante monta `{sub, email, role: "ADMIN"}`, assina com `'secret'` e tem gestão total. Não há erro, log ou sintoma.
**Impacto (segurança):** comprometimento completo, silencioso, dependente de uma variável de ambiente ausente. O `?? 'secret'` existe para o dev não precisar de `.env` — e é exatamente isso que o torna perigoso: falha *aberta*, não fechada.
**Correção:** remover os dois fallbacks e falhar no startup (`validationSchema` no `ConfigModule.forRoot` cobrindo `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`). Resolve B1, A3 e A7 de uma vez. É a ação #1.

**A1 — `GET /projects/:projectId/tasks/:id` ignora o `projectId` → leitura cross-project por `CLIENTE`** *(persiste da 2ª passagem — inalterado)*
`get-task.use-case.ts:8` (`execute(id)`) + `tasks.controller.ts:77-79` (não passa `projectId`; `@Get(':id')` **sem `@Roles`** → acessível a `CLIENTE`).
O `ProjectAccessGuard` valida o `:projectId` da URL, mas a task é buscada só por `id`. Um `CLIENTE` com acesso ao projeto A chama `GET /projects/A/tasks/<id-de-task-do-projeto-B>` e lê título, descrição e checklist de qualquer projeto.
**Impacto (segurança):** quebra de isolamento entre clientes — o que o `ProjectAccess` existe para impedir.
**Correção:** `getTask.execute(projectId, id)` + `if (task.projectId !== projectId) throw new ForbiddenException()`. O padrão já existe em dois lugares no repo (`update-risk.use-case.ts:13` e todo o CRM) — é só replicar.

---

### 🟠 Alto

**A2 — Sub-recursos de task escrevíveis sem validar posse do pai (IDOR latente)** *(persiste — inalterado)*
- Checklist: `update-checklist-item.use-case.ts:9-11` e `delete-checklist-item.use-case.ts:9-11` só checam existência; o controller (`tasks.controller.ts:129-139`) **nem recebe `projectId`**.
- Dependências: `tasks.controller.ts:117-118` → `removeDependency.execute(depId)`, sem checar projeto.
- Reorder: `reorder-tasks.use-case.ts:8` → `repo.reorder(items)` recebe ids soltos, **sem `projectId`** (`tasks.controller.ts:73`). Reordena task de qualquer projeto.
**Impacto:** hoje `@Roles(INSERE+)` barra `CLIENTE` e os papéis internos já têm escopo global — exploração real baixa. Mas é IDOR latente: vira escalonamento imediato se o RBAC ganhar escopo por projeto, e já permite mutar dados pela URL do projeto errado.
**Correção:** propagar `projectId` até o use-case e validar a cadeia (`item → task.projectId === projectId`; dependência via `predecessor.projectId`; reorder validando o lote). Extrair um `assertBelongsToProject` no shared kernel.

**A3/A7 — Secrets e config via `process.env` cru, sem validação de startup** *(persiste; ver B1)*
`jwt-token.service.ts:25,34` (`JWT_REFRESH_SECRET` sem fallback → sign/verify com `undefined`), `main.ts:9,15`, `ConfigModule.forRoot({ isGlobal: true })` em `app.module.ts:30` **sem `validationSchema`**.
**Correção:** ver B1 — mesma ação resolve os três.

**A4 — `resolveEntity` do `AuditInterceptor` não reconhece cuid → trilha inútil em UPDATE/DELETE** *(persiste — inalterado)*
`audit.interceptor.ts:19` — `!/^[a-z]/.test(seg)` nunca casa um cuid (que começa com `c` minúsculo). Em `PATCH/DELETE /projects/abc/tasks/def`, nenhum segmento é reconhecido → `entityId:'new'` → body de DELETE vazio → grava `entityId:'unknown'` e `entity` = o próprio cuid.
**Impacto (rastreabilidade — relevante p/ biotech):** a auditoria não diz **qual** entidade mudou na maioria das mutações. Com 17 módulos agora, o volume de trilha inútil só cresce.
**Correção:** regex de cuid (`/^c[a-z0-9]{24}$/`) varrendo segmentos de trás p/ frente; `entity` = segmento anterior, `entityId` = cuid.

---

### 🟡 Médio

**A5 — Mapper de saída ausente no núcleo antigo** *(melhorou muito — escopo reduzido)*
Todo o CRM e `projects` mapeiam. Ainda devolvem linha do Prisma crua: `tasks` (`WITH_RELATIONS` → `TaskWithRelations` direto no controller), `risks`, `charter`, `wbs`, `milestones`, `stakeholders`.
**Impacto:** mudança de schema vaza para o contrato da API e para o front nesses módulos.
**Correção:** um mapper por módulo, como no CRM. KISS — só a fronteira.

**A6 — `before` nunca capturado na auditoria** *(persiste)*
`audit.interceptor.ts:62` grava só `after`. O interceptor HTTP não tem o estado anterior.
**Correção (incremental):** popular `before` via `AuditService.log()` explícito nos updates que importam (charter approve, project status, task status).

---

### 🔵 Baixo

**A8 — Sem filtro global de exceção** *(persiste — confirmado: zero `ExceptionFilter` no projeto)* — erros viram 500 sem shape padronizado; o front faz `err.message ?? 'Erro'`.

**A9 — Imports mortos** *(persiste e cresceu)* — `main.ts:1` (`Reflector`) e `app.module.ts:4` (`JwtModule`, importado mas ausente do array `imports`). Viola "sem imports não usados".

**B2 — `take` do cliente sem teto** *(novo)* — `interactions.prisma.repository.ts:59` → `take: filter.take ?? 50`, e `interactions.controller.ts:46` passa `Number(take)` da query sem validar. `?take=999999` faz varredura completa. Default existe, teto não.
**Correção:** `Math.min(take ?? 50, 100)`.

**B3 — Reorder não valida o lote contra o pai** *(novo)* — `manage-stages.use-case.ts:42` (`reorder`) só confere que o pipeline existe; os `items` podem referenciar etapas de outro funil. ADMIN-only → risco baixo. Mesmo formato de A2 em `tasks`.

---

## 4. Prontidão para escala

| Aspecto | Estado | Risco com muitos módulos |
|---|---|---|
| Secrets/config (B1/A3/A7) | 🔴 fallback `'secret'` | falha **aberta** e silenciosa; cada serviço novo copia o padrão |
| Posse de sub-recurso (A1/A2) | 🟠 CRM ✅ / `tasks` ❌ | dois padrões convivendo; quem copiar `tasks` replica o IDOR |
| Mapper de saída (A5) | 🟡 CRM ✅ / núcleo antigo ❌ | contrato colado ao schema nos módulos antigos |
| `resolveEntity` (A4) | 🟠 quebrado p/ cuid | trilha cresce inútil em 17 módulos; retrofit encarece |
| Guards globais | ✅ um lugar | escala bem — manter |
| Testes de use-case | ✅ 17 specs, concentrados no CRM | núcleo antigo (`tasks`) segue sem cobertura de RBAC |
| Comunicação inter-módulo | ✅ via Prisma compartilhado | quando um módulo precisar de outro, passar por porta/interface |

---

## 5. Top 3 ações (próxima sessão)

1. **Matar o fallback `?? 'secret'` + `validationSchema` no `ConfigModule`** (B1 + A3 + A7). Uma mudança pequena que fecha o único caminho para comprometimento total. Faça antes de qualquer deploy.
2. **Escopar acesso a sub-recurso pelo `projectId` em `tasks`** (A1 + A2). A1 é vazamento real para `CLIENTE` hoje; o padrão correto já existe no CRM — é replicação, não design.
3. **Corrigir `resolveEntity` com regex de cuid** (A4) — ~10 linhas, devolve utilidade à trilha de auditoria.

> **Melhorou desde a 2ª passagem:** A5 deixou de ser sistêmico (mapper é regra no CRM); posse de sub-recurso resolvida corretamente em todos os módulos novos; cobertura de teste saiu de 2 para 17 specs.
> **Persistem inalterados:** A1, A2, A3, A4, A6, A7, A8, A9.
> **Novos:** B1 (🔴 fallback de secret), B2 (take sem teto), B3 (reorder sem validar lote).
> **Leitura de tendência:** o código novo está claramente melhor que o antigo. A dívida agora é **retrofit do núcleo de projetos**, não de arquitetura.
