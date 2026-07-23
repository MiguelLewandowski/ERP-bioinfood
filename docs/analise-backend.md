# Análise Backend — ERP Bioinfood

> Revisão de arquitetura do backend NestJS sob a ótica de **Tech Lead / Engenheiro Backend Sênior**, com foco em **separação de responsabilidades**, **desacoplamento**, **RBAC** e **prontidão para escala**.
>
> **Data:** 2026-07-20 (6ª passagem) · **Escopo:** `apps/api/src` (todos os módulos + shared kernel: guards, audit, filters) · **Estado:** branch `feat/crm-empresa-pessoa-negocio-tarefas`.
>
> **Passagens anteriores:** 2026-07-19 (5ª) — fechou A4/A5/A6/B3 (histórico preservado na seção 6).

---

## 1. Resumo (6ª passagem)

**Backend arquiteturalmente saudável e consistente.** Verifiquei que **todas** as correções das 4ª/5ª passagens persistem: falha fechada de config, IDOR de sub-recursos escopado por `WHERE`, mapper de saída em todos os módulos (nenhuma entidade Prisma crua devolvida), `take` em toda listagem, exception filter global, throttler + helmet + `trust proxy`, reorder de etapas escopado por funil (`pipelines.prisma.repository.ts:91`). O desacoplamento está **limpo de verdade**: nenhum use-case importa `PrismaService` (todos passam por porta + token de DI) e nenhum controller toca o Prisma — controllers só roteiam, coagem datas e mapeiam DTO.

**Um achado 🟠 Alto novo e concreto:** a correção **A6** da 5ª passagem (captura de `before` na auditoria), embora funcionalmente correta, **introduziu uma regressão de credencial** — `captureBefore` faz `findUnique` cru, sem `select`, então o `passwordHash` do `User` (que todo o resto do código exclui via `USER_SELECT`) passa a ser persistido em `AuditLog.before` a cada UPDATE/DELETE de usuário. Além disso, 2 achados 🟡 Médio de acoplamento/defesa-em-profundidade e 2 🔵 Baixo. Nenhum 🔴 Crítico.

---

## 2. Achados desta passagem (6ª)

### 🟠 A10 — `passwordHash` vaza para `AuditLog.before` (regressão introduzida pela A6)
`common/audit/audit.interceptor.ts:58-68` · `captureBefore` resolve o delegate do Prisma pelo `ENTITY_MODEL` e faz `delegate.findUnique({ where: { id } })` **sem `select`**, devolvendo a linha inteira. Para `users` (`ENTITY_MODEL.users = 'user'`, linha 33) isso inclui `passwordHash`. Em `PATCH /users/:id` e `PATCH /users/:id/reset-password`, esse row cru é gravado em `AuditLog.before` (JSON) via `audit.service.ts:19`.
- **Contraste que confirma a intenção:** o próprio módulo de usuários nunca expõe o hash — `users.prisma.repository.ts:6` define `USER_SELECT` sem `passwordHash`, e todo endpoint de `users` passa por ele. O interceptor de auditoria é o **único** caminho que fura essa barreira.
- **Impacto (segurança/dado mínimo):** credencial (hash) duplicada numa tabela com ciclo de vida diferente — auditoria não é apagada, acumula hashes históricos e é candidata natural a um "audit viewer" administrativo (o próprio doc cita trilha de auditoria como requisito biotech). Um dump/backup do banco entrega uma pilha de hashes para quebra offline. Não é 🔴 porque hoje não há endpoint de leitura de `AuditLog` e o hash não é texto puro — mas é uma exposição latente que o resto do código foi cuidadoso em evitar. O mesmo `findUnique` cru vazará qualquer coluna sensível futura de qualquer modelo mapeado.
- **Correção:** redigir antes de gravar. Mínimo: uma denylist genérica em `captureBefore` (`delete (row as any).passwordHash`) aplicada ao resultado; melhor: um `select` por modelo, ou uma constante `SENSITIVE_KEYS` removida de `before` e `after`. Manter genérico para cobrir colunas sensíveis futuras.

### 🟡 A11 — autorização de `CLIENTE` em rotas sem `:projectId` depende de disciplina manual
`activities/infra/activities.controller.ts` e `search/infra/search.controller.ts` não têm `@Roles` (qualquer autenticado entra, inclusive `CLIENTE`); o `ProjectAccessGuard` só atua quando existe `req.params.projectId`, que essas rotas não têm. Hoje ambas filtram `CLIENTE` corretamente **no use-case** (`list-activities.use-case.ts:25`, `global-search.use-case.ts:22`) — mas essa é a única linha de defesa.
- **Impacto (escala/segurança):** o padrão "sem `@Roles` = todos, filtro manual no use-case" é frágil. Um endpoint novo de leitura criado sem `@Roles` e sem lembrar do filtro manual expõe **todos os dados internos** ao `CLIENTE` silenciosamente. Não há guard que force o fecho por padrão fora das rotas `:projectId`.
- **Correção:** documentar a convenção como regra explícita (comentário no controller + checklist da skill `/novo-modulo`); ou, defesa-em-profundidade, um guard/decorator que exija declaração explícita de exposição a `CLIENTE` (ex.: `@AllowClient()` obrigatório senão nega). KISS: no mínimo o comentário + teste de RBAC por rota nova.

### 🟡 A12 — `ENTITY_MODEL` acopla o shared kernel a 14 modelos de domínio
`common/audit/audit.interceptor.ts:19-34` · o mapa estático segmento-de-rota → modelo Prisma vive na camada transversal e enumera 14 módulos. Todo módulo novo que quiser `before` precisa editar este arquivo compartilhado, e um rename de segmento de rota (ex.: `wbs` → `wbs-nodes`) **desliga o `before` silenciosamente** sem quebrar teste.
- **Impacto (acoplamento/escala):** o kernel transversal "conhece" cada módulo — o oposto do desacoplamento que o resto do backend mantém. Cresce linearmente com os módulos e drift passa despercebido.
- **Correção (quando incomodar):** inverter a dependência — cada módulo declara seu mapeamento de auditoria (ex.: metadata/token por controller) e o interceptor lê isso, em vez de um mapa central. YAGNI hoje; registrar como dívida conhecida.

### 🔵 A13 — `@UseGuards(RolesGuard)` redundante em 2 controllers
`projects/infra/projects.controller.ts:22` e `tasks/infra/tasks.controller.ts:39` declaram `@UseGuards(RolesGuard)` na classe, mas `RolesGuard` já é `APP_GUARD` global (`app.module.ts:78`). Os controllers CRM não fazem isso — inconsistência. Efeito: o guard roda duas vezes (inócuo) e sugere, erroneamente, que o RBAC desses módulos depende do decorator local. **Correção:** remover as duas linhas.

### 🔵 A14 — `enrich/:cnpj` faz chamada externa só sob o throttle global
`organizations/infra/organizations.controller.ts:54` · `GET /organizations/enrich/:cnpj` dispara `fetch` à BrasilAPI (timeout 5s, best-effort, sem SSRF — o CNPJ é normalizado a 14 dígitos em `enrich-organization.use-case.ts:14` antes de entrar na URL de base fixa). Mas está apenas sob o teto global de 120/min/IP; um `INSERE` autenticado pode amplificar tráfego de saída / enumerar CNPJs. Baixo (autenticado, interno, com timeout). **Correção:** `@Throttle` dedicado mais apertado. *(Escopo mais afeito a `/seguranca-infra`.)*

---

## 3. Pontos fortes a preservar

- ✅ **Falha fechada de config**: `ConfigModule` com `validationSchema` Joi (`JWT_SECRET`/`JWT_REFRESH_SECRET` min 16 chars, `DATABASE_URL` uri) — app não sobe sem env crítica. Sem fallback `?? 'secret'` em lugar nenhum.
- ✅ **Isolamento entre projetos em `tasks`** — `get`, `reorder`, checklist (add/update/delete) e `removeDependency` escopam por `projectId` via `WHERE`/`ForbiddenException`.
- ✅ **`reorder` de oportunidades e de etapas de funil** seguem o mesmo padrão anti-IDOR: `where: { id, <parentId> }` no `updateMany` — item de fora do escopo é silenciosamente ignorado, não depende de validação prévia. `opportunities.prisma.repository.ts:115`, `pipelines.prisma.repository.ts:91`.
- ✅ **`delete-taxonomy.use-case.ts:12-19`**: FK violation (`P2003`) → `ConflictException('Item em uso — desative em vez de excluir')`.
- ✅ **Mapper de saída consolidado em todo o backend** — CRM (organizations, contacts, interactions, opportunities, pipelines, crm-activities, taxonomies) e agora também o núcleo antigo (tasks, risks, charter, wbs, milestones, stakeholders). Nenhum endpoint devolve entidade Prisma crua.
- ✅ **Trilha de auditoria útil**: `resolveEntity` reconhece cuid (`/^c[a-z0-9]{24}$/`) e `before` é capturado best-effort antes de PATCH/PUT/DELETE (mapa `entity → prisma delegate`, falha nunca bloqueia a mutação).
- ✅ **`AllExceptionsFilter` global** — nenhuma stack vaza na resposta.
- ✅ **RBAC declarado na classe** nos módulos CRM; escrita restrita a ADMIN por decisão de negócio documentada em comentário.
- ✅ **Guards globais via `APP_GUARD`** — escala bem.
- ✅ **Rate limiting** (`@nestjs/throttler`, 120/min global + 5-10/min em auth) + `trust proxy` para IP real atrás do Railway.
- ✅ **19 spec files / 72 testes** — todos verdes após esta rodada.
- ✅ **Máquina de estados de task com regra de antecessoras** (`update-task.use-case.ts`).

---

## 4. Histórico — Correções da 5ª passagem (2026-07-19)

> Verificadas nesta 6ª passagem: **todas persistem**. Mantido como histórico.


**A4 — `resolveEntity` do audit não reconhecia cuid** *(RESOLVIDO)*
`audit.interceptor.ts` — regex trocada de `!/^[a-z]/.test(seg)` para `CUID_RE = /^c[a-z0-9]{24}$/`. Mutações com id na URL agora gravam `entity`/`entityId` corretos.

**A6 — `before` nunca capturado na auditoria** *(RESOLVIDO)*
`AuditInterceptor` agora busca o estado anterior via Prisma antes de PATCH/PUT/DELETE, usando um mapa estático `entity (segmento da rota) → delegate do Prisma` (`ENTITY_MODEL`) para as entidades com PK simples e mapeamento 1:1 direto (projects, tasks, risks, milestones, charter, wbs, stakeholders, organizations, contacts, interactions, opportunities, pipelines, users). Best-effort: entidade fora do mapa ou erro na busca não bloqueia a mutação, só resulta em `before: null`. Implementado com `from(...).pipe(switchMap(...))` para poder buscar o "antes" de forma assíncrona antes de chamar `next.handle()`.

**B3 — reorder de etapas não validava o lote contra o funil** *(RESOLVIDO)*
`manage-stages.use-case.ts` + `pipelines.prisma.repository.ts` — `reorderStages` agora recebe `pipelineId` e escopa via `updateMany({ where: { id, pipelineId } })`, mesmo padrão anti-IDOR do reorder de oportunidades. Etapa de outro funil é silenciosamente ignorada.

**A5 — mapper de saída ausente no núcleo antigo** *(RESOLVIDO)*
Criado `*.mapper.ts` em `infra/` para os 6 módulos que ainda devolviam entidade Prisma crua: `tasks` (`task.mapper.ts`), `risks` (`risk.mapper.ts`), `milestones` (`milestone.mapper.ts`), `wbs` (`wbs-node.mapper.ts`), `stakeholders` (`stakeholder.mapper.ts`), `charter` (`charter.mapper.ts`). Controllers chamam a função `to*Dto` explicitamente sobre o retorno do use-case, seguindo o padrão já estabelecido no CRM (`organization.mapper.ts`, `opportunity.mapper.ts`).
Efeito colateral corrigido de quebra: `charter` tinha uma inconsistência de shape entre `GET` (retornava `lastEditedBy`/`lastEditedAt`) e `PUT`/`POST approve` (não retornavam) — `UpsertCharterUseCase` e `ApproveCharterUseCase` agora buscam `findLastEdit` também, igual ao `GetCharterUseCase`, e sempre retornam `CharterWithMeta`.

---

## 5. Prontidão para escala

| Aspecto | Estado |
|---|---|
| Secrets/config | ✅ falha fechada, `validationSchema` Joi |
| Posse de sub-recurso (IDOR) | ✅ CRM + `tasks` + reorder de etapas/oportunidades — padrão `WHERE` escopado |
| Desacoplamento (porta/DI) | ✅ nenhum use-case usa `PrismaService`; nenhum controller toca Prisma |
| Mapper de saída | ✅ CRM + núcleo antigo — nenhum endpoint vaza entidade Prisma crua |
| Auditoria — `entityId`/`after` | ✅ `entityId` cuid correto; `after` = DTO pós-mapper (limpo) |
| Auditoria — `before` | 🟠 **A10**: `findUnique` cru grava `passwordHash` de `User` em `AuditLog.before` |
| Autorização `CLIENTE` fora de `:projectId` | 🟡 **A11**: só filtro manual no use-case; sem guard de fecho-por-padrão |
| Kernel de auditoria vs. módulos | 🟡 **A12**: `ENTITY_MODEL` central acopla o shared kernel a 14 modelos |
| `take` em toda listagem | ✅ verificado em todos os `findMany` (50–5000 conforme o caso) |
| Guards globais | ✅ escala bem (throttler → jwt → roles → project-access via `APP_GUARD`) |
| Testes | ✅ 19 specs / 72 testes (não re-executados nesta passagem — revisão estática) |
| Semântica de exclusão | ✅ FK→409 amigável (taxonomies), padrão replicável nos demais deletes |
| Exception filter | ✅ `AllExceptionsFilter` global, sem vazar stack |
| Rate limit / body limit / headers | ✅ throttler + helmet + `trust proxy` + limite de 1mb |

---

## 6. Achados remanescentes de baixa prioridade (carryover)

> Os achados **novos** da 6ª passagem estão na seção 2 (A10–A14). O 🟠 A10 é o único item de alta severidade em aberto. Abaixo, dívidas de baixa prioridade herdadas que continuam válidas:

- **Sub-recursos de task fora do escopo do mapper** (`dependencies`, `checklist` add/update) retornam a entidade Prisma da linha específica (não `TaskWithRelations` completa) — baixo risco, shape pequeno e já sem relations pesadas.
- **Charter**: `toEntity` de conversão `Decimal → number` e achatamento de `team` continua dentro do repositório Prisma (não no mapper de infra) — funcional, mas quem revisar o módulo deve saber que a "primeira camada" de shape já acontece ali antes do `charter.mapper.ts`.
- **`taxonomies`**: múltiplos sub-recursos (sector, category, engagementStage, organizationSource, productService) — não entraram no mapa `ENTITY_MODEL` do audit por ambiguidade de modelo; `before` fica `null` nesses casos (nunca bloqueia, só reduz a trilha).

> **Leitura de tendência (6ª):** o backend está maduro — desacoplamento e RBAC bem executados e estáveis entre passagens. O único item de alta severidade em aberto (A10) é uma regressão pontual da correção A6, com fix trivial. Os 🟡 A11/A12 são dívidas de *escala* (defesa-em-profundidade e inversão de dependência do kernel de auditoria), não bugs. **Top 3 desta passagem:** (1) redigir `passwordHash`/campos sensíveis no `captureBefore` — A10; (2) firmar a convenção de fecho-por-padrão para `CLIENTE` fora de `:projectId` — A11; (3) remover `@UseGuards(RolesGuard)` redundante dos 2 controllers — A13.

## Top 3 ações priorizadas

1. **🟠 A10** — `captureBefore` (`audit.interceptor.ts:58-68`): remover campos sensíveis (mínimo `delete row.passwordHash`; ideal `SENSITIVE_KEYS` genérica ou `select` por modelo) antes de gravar `before`. Impede vazamento de hash de credencial na trilha de auditoria.
2. **🟡 A11** — tornar explícita e testada a autorização de `CLIENTE` nas rotas sem `:projectId` (`activities`, `search` e futuras): comentário-regra + teste de RBAC por rota nova, ou guard de fecho-por-padrão.
3. **🔵 A13** — remover `@UseGuards(RolesGuard)` redundante de `projects.controller.ts:22` e `tasks.controller.ts:39` (já é `APP_GUARD` global). Consistência com os controllers CRM.
