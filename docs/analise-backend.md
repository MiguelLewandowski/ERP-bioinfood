# Análise Backend — ERP Bioinfood

> Revisão de arquitetura do backend NestJS sob a ótica de **Tech Lead / Engenheiro Backend Sênior**, com foco em **separação de responsabilidades**, **desacoplamento**, **RBAC** e **prontidão para escala**.
>
> **Data:** 2026-07-19 (4ª passagem) · **Escopo:** `apps/api/src` (18 módulos; + `search` desde a 3ª) · **Estado:** branch `feat/crm-empresa-pessoa-negocio-tarefas` — kanban order de oportunidades, sigla de funil, exclusão de taxonomias.

---

## 1. Resumo

**Nenhuma das top 3 ações da 3ª passagem foi executada** — o 🔴 `?? 'secret'` do JWT, o IDOR de leitura em `tasks` e o `resolveEntity` quebrado seguem exatamente como estavam. Em compensação, o código novo da onda **manteve (e elevou) o padrão do CRM**: o reorder de oportunidades valida o lote contra a etapa direto no `WHERE` (`opportunities.prisma.repository.ts:115-123`, com comentário anti-IDOR explícito) e a exclusão de taxonomia converte violação de FK em `ConflictException` amigável. **O fosso entre o núcleo antigo (`tasks`) e o resto do backend só aumenta** — e o risco também, porque o fallback de secret continua a um deploy de distância de um comprometimento total.

---

## 2. Pontos fortes a preservar

- ✅ **`reorder` de oportunidades é o novo padrão de referência anti-IDOR**: `where: { id: i.id, stageId }` — item de outra etapa é silenciosamente ignorado no banco, não depende de validação prévia (`opportunities.prisma.repository.ts:115`). Com spec (`reorder-opportunities.use-case.spec.ts`). É o modelo para consertar o reorder de `tasks` e o de `stages`.
- ✅ **`delete-taxonomy.use-case.ts:12-19`**: FK violation (`P2003`) → `ConflictException('Item em uso — desative em vez de excluir')` — semântica de exclusão correta e mensagem na língua do usuário.
- ✅ **Mapper de saída consolidado em todo o CRM** (organizations, contacts, interactions, opportunities, pipelines, crm-activities, taxonomies).
- ✅ **RBAC declarado na classe** nos módulos CRM; escrita restrita a ADMIN por decisão de negócio documentada em comentário (`opportunities.controller.ts:19`).
- ✅ **Guards globais via `APP_GUARD`** — inalterado, segue escalando bem.
- ✅ **19 spec files** (era 17) — a onda nova chegou com teste.
- ✅ **Máquina de estados de task com regra de antecessoras** (`update-task.use-case.ts`) — e `update`/`delete` de task **já validam `task.projectId !== projectId`** (o retrofit parcial aconteceu).

---

## 3. Achados por severidade

### 🔴 Crítico

**B1 — `JWT_SECRET` com fallback hardcoded `'secret'` → forja de token ADMIN se a env faltar** *(persiste inalterado desde 2026-07-17 — TERCEIRA passagem consecutiva)*
`auth.module.ts:21` e `jwt.strategy.ts:12`: `process.env.JWT_SECRET ?? 'secret'`. `ConfigModule.forRoot` segue **sem `validationSchema`**. Se a env faltar em produção, a API sobe normalmente e aceita qualquer JWT assinado com a string `'secret'` — role ADMIN forjável, sem log nem sintoma.
**Correção (inalterada):** remover os dois fallbacks + `validationSchema` cobrindo `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`. ~20 linhas. **Fazer antes de qualquer deploy.**

**A1 — `GET /projects/:projectId/tasks/:id` ignora o `projectId` → leitura cross-project por `CLIENTE`** *(persiste inalterado)*
`get-task.use-case.ts:8` (`execute(id)`), `tasks.controller.ts:77-80` (`@Get(':id')` sem `@Roles` e sem passar `projectId`). `CLIENTE` com acesso ao projeto A lê task de qualquer projeto B trocando o id na URL. O padrão correto está **no mesmo arquivo**: `update` (linha 90) e `remove` (linha 100) já passam `projectId` e o use-case valida com `ForbiddenException`.
**Correção:** replicar o que `update-task.use-case.ts:19-20` já faz. 3 linhas.

### 🟠 Alto

**A2 — Sub-recursos de task ainda escrevíveis sem validar posse do pai** *(parcialmente melhorado: update/delete de task validam; o resto não)*
- `tasks.controller.ts:71-75` — `reorder` não recebe `projectId`; `reorder-tasks.use-case` aceita ids de qualquer projeto. Contrastar com o reorder de oportunidades, que resolve isso no `WHERE`.
- `tasks.controller.ts:115-119` — `removeDep.execute(depId)` sem escopo.
- `tasks.controller.ts:123-139` — checklist add/update/delete só por `taskId`/`itemId`, sem cadeia até o projeto.
**Correção:** aplicar o padrão `where: { id, projectId }` do reorder de oportunidades (`updateMany` escopado) — mais simples que propagar validação em duas etapas.

**A3/A7 — Config via `process.env` cru sem validação de startup** *(persiste — resolve junto com B1)*
`jwt-token.service.ts` (`JWT_REFRESH_SECRET` sem fallback → sign com `undefined`), `main.ts`, CORS fixo.

**A4 — `resolveEntity` do audit não reconhece cuid → trilha inútil em UPDATE/DELETE** *(persiste inalterado)*
`audit.interceptor.ts:14-24` — `!/^[a-z]/.test(seg)` nunca casa cuid (começa com `c`). Toda mutação com id na URL grava `entityId:'new'`/entidade errada.
**Correção:** regex `/^c[a-z0-9]{24}$/`, ~10 linhas.

### 🟡 Médio

**A5 — Mapper de saída ausente no núcleo antigo** *(persiste; escopo: `tasks`, `risks`, `charter`, `wbs`, `milestones`, `stakeholders`)*
`tasks.controller.ts` devolve `TaskWithRelations` (linha do Prisma com includes) cru — o contrato da API é o schema.
**A6 — `before` nunca capturado na auditoria** *(persiste)* — só `after`; sem estado anterior nas mutações que importam (approve de charter, status de projeto/task).
**B3 — `manage-stages.use-case.ts:42-44`: reorder de etapas valida o funil mas não o lote** *(persiste)* — itens podem referenciar etapas de outro funil. ADMIN-only → risco baixo, mas o fix agora é cópia do reorder de oportunidades.

### 🔵 Baixo

**A8 — Sem filtro global de exceção** *(persiste — zero `ExceptionFilter`)*.
**A9 — Imports mortos** *(persistem)* — `main.ts:1` (`Reflector`), `app.module.ts:4` (`JwtModule`).
**B2 — `take` sem teto** *(persiste e ganhou um caso)* — `interactions.prisma.repository.ts:59` (`?? 50`) e `crm-activities.prisma.repository.ts:85` (`?? 200`); nenhum `Math.min(..., 100)`. `?take=999999` varre a tabela.

---

## 4. Prontidão para escala

| Aspecto | Estado | Risco com muitos módulos |
|---|---|---|
| Secrets/config (B1/A3/A7) | 🔴 **3ª passagem sem correção** | falha aberta e silenciosa; risco cresce a cada deploy |
| Posse de sub-recurso | 🟠 CRM ✅ (agora com padrão em `WHERE`) / `tasks` parcial | `get`/`reorder`/checklist/deps de tasks seguem abertos; quem copiar `tasks` replica |
| Mapper de saída (A5) | 🟡 CRM ✅ / núcleo antigo ❌ | inalterado |
| Auditoria (A4/A6) | 🟠 quebrada p/ cuid | trilha inútil acumulando; retrofit encarece |
| Guards globais | ✅ | escala bem |
| Testes | ✅ 19 specs | núcleo `tasks` segue sem spec de RBAC/posse |
| Semântica de exclusão | ✅ melhorou (taxonomies P2003→409) | padrão a replicar nos demais deletes |

---

## 5. Top 3 ações (idênticas à 3ª passagem — nada foi executado)

1. **Matar `?? 'secret'` + `validationSchema` no ConfigModule** (B1/A3/A7). Terceira passagem consecutiva apontando; é a única porta de comprometimento total do sistema e custa ~20 linhas.
2. **Escopar `tasks` pelo projeto** (A1 + A2): `get` (3 linhas, padrão já no arquivo) e reorder/checklist/deps via `WHERE` escopado (padrão novo do reorder de oportunidades).
3. **Corrigir `resolveEntity` com regex de cuid** (A4) — ~10 linhas, devolve utilidade à trilha de auditoria.

> **Melhorou desde a 3ª passagem:** reorder de oportunidades nasceu com anti-IDOR no `WHERE` + spec; delete de taxonomia com FK→409 amigável; `update`/`delete` de task validam posse (retrofit parcial de A2); 19 specs.
> **Persistem inalterados:** B1 🔴, A1 🔴, A2 (parcial), A3/A4/A5/A6/A7/A8/A9, B2, B3.
> **Leitura de tendência:** o padrão novo é consistentemente bom e cada onda o reforça — mas as correções do núcleo antigo **não acontecem sozinhas**: três passagens apontando o mesmo 🔴 sem execução. Recomendo travar a próxima sessão de implementação nas top 3 antes de qualquer feature nova.
