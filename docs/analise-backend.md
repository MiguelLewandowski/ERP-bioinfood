# Análise Backend — ERP Bioinfood

> Revisão de arquitetura do backend NestJS sob a ótica de **Tech Lead / Engenheiro Backend Sênior**, com foco em **separação de responsabilidades**, **desacoplamento**, **RBAC** e **prontidão para escala**.
>
> **Data:** 2026-06-26 (2ª passagem) · **Escopo:** `apps/api/src` (todos os módulos) · **Estado:** módulos projects, tasks, charter, wbs, risks, milestones, users, auth implementados.

---

## 1. Resumo

A base mantém a maturidade da 1ª passagem: Clean Architecture consistente, repository pattern por token de DI, três guards globais (`JwtAuthGuard` → `RolesGuard` → `ProjectAccessGuard`) e soft delete filtrado. O risco que **escalou** desde a última análise é de **controle de acesso a sub-recursos**: vários use-cases aninhados resolvem a entidade **só pelo id**, ignorando o `:projectId` da rota — o que abre **leitura cross-project para `CLIENTE`** no GET de task. Persistem ainda os dois achados de auditoria/secret da 1ª passagem.

---

## 2. Pontos fortes a preservar

- ✅ **Três guards globais via `APP_GUARD`** (`app.module.ts:34-36`): todo controller novo nasce autenticado, com RBAC e gating de `CLIENTE` por `ProjectAccess`.
- ✅ **`ProjectAccessGuard` no nível do projeto** (`project-access.guard.ts:18-23`): `CLIENTE` sem `ProjectAccess` é barrado em qualquer rota `:projectId`.
- ✅ **`UpdateRiskUseCase` valida posse do pai** (`update-risk.use-case.ts:13`): `risk.projectId !== projectId → Forbidden`. **Este é o padrão correto** — os demais módulos deveriam segui-lo (ver A1).
- ✅ **Mapper de saída em projects** (`projects.controller.ts:16,33,51` → `toProjectDto`): desacopla o contrato da API do schema Prisma.
- ✅ **Máquina de estado e cálculo no domínio/aplicação** (`calculateRiskScore`, transições) — fora do controller.
- ✅ **`take` em todas as listagens** (`tasks.prisma.repository.ts:30,77`) e `USER_SELECT` evitando vazar `passwordHash`.
- ✅ **CORS via env** (`main.ts:9-13`) com allowlist e `credentials` — melhor que origem fixa.

---

## 3. Achados por severidade

### 🔴 Crítico

**A1 — `GET /projects/:projectId/tasks/:id` ignora o `projectId` → leitura cross-project por `CLIENTE`**
`get-task.use-case.ts:8` (`execute(id)`) + `tasks.controller.ts:77-79` (não passa `projectId`, e `@Get(':id')` **não tem `@Roles`** → acessível a `CLIENTE`).
O `ProjectAccessGuard` valida que o `CLIENTE` tem acesso ao `:projectId` da URL — mas a task é buscada só por `id`. Um `CLIENTE` com acesso ao projeto A pode chamar `GET /projects/A/tasks/<id-de-task-do-projeto-B>` e **ler título, descrição e checklist de qualquer projeto** (o guard passa por causa de A; o use-case devolve a task de B).
**Impacto (segurança):** quebra de isolamento entre clientes — exatamente o que o `ProjectAccess` existe para impedir. `list` é escopado (`findAllByProject`), mas o GET por id não.
**Correção:** seguir o padrão de risks — `getTask.execute(projectId, id)` e no use-case `if (task.projectId !== projectId) throw new ForbiddenException()`. Aplicar a mesma assinatura no `findById` (filtrar por `projectId`) ou validar no use-case.

---

### 🟠 Alto

**A2 — Sub-recursos de task escrevíveis sem validar posse do pai (IDOR latente)**
- Checklist: `update-checklist-item.use-case.ts:8-11` e `delete-checklist-item.use-case.ts:8-12` só checam que o item existe — nunca que pertence a uma task do `:projectId`. O controller (`tasks.controller.ts:129-139`) **nem recebe `projectId`**.
- Dependências: `tasks.controller.ts:115-119` → `removeDependency.execute(depId)` apaga qualquer dependência por id, sem checar projeto.
**Impacto (segurança/consistência):** hoje o gating de `@Roles(INSERE+)` impede `CLIENTE`, e os papéis internos já têm escopo global — então a exploração real é baixa. Mas é **IDOR latente**: vira escalonamento imediato se algum dia o RBAC ganhar escopo por projeto, e já permite mutar dados via a URL do "projeto errado". Inconsistente com risks (A1 do lado bom).
**Correção:** passar `projectId` até o use-case e validar a cadeia `item → task.projectId === projectId` (idem dependência via `predecessor.projectId`). Centralizar num helper de `assertBelongsToProject`.

**A3 — `JWT_REFRESH_SECRET` lido via `process.env` direto, sem validação de startup** *(persiste da 1ª passagem)*
`jwt-token.service.ts:25` e `:34`. Se a env não existir em produção, o sign/verify usa secret `undefined` e **não falha na inicialização** — só na 1ª request, e tokens ficam assináveis/verificáveis com secret vazio.
**Correção (mínima):** `validationSchema` (Joi/zod) no `ConfigModule.forRoot` cobrindo `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`. Ou, no mínimo, `if (!secret) throw` no construtor do serviço.

**A4 — `resolveEntity` do `AuditInterceptor` não reconhece cuid → trilha inútil em UPDATE/DELETE** *(persiste da 1ª passagem)*
`audit.interceptor.ts:19` — `!/^[a-z]/.test(seg)` nunca casa um cuid (que começa com `c` minúsculo). Em `PATCH/DELETE /projects/abc/tasks/def`, nenhum segmento é reconhecido como id → cai em `entityId:'new'` → como o body de DELETE é vazio, grava `entityId:'unknown'` e `entity` = o próprio cuid.
**Impacto (rastreabilidade — relevante p/ biotech):** a auditoria não consegue dizer **qual** entidade mudou na maioria das mutações.
**Correção:** regex de cuid (`/^c[a-z0-9]{24}$/`) varrendo os segmentos de trás p/ frente; `entity = segmento anterior`, `entityId = cuid`.

---

### 🟡 Médio

**A5 — Contrato da API acoplado ao Prisma fora de projects (sem mapper de saída)**
Só `projects` tem `toProjectDto`. `tasks`/`risks`/`charter`/`wbs`/`milestones` devolvem a linha do Prisma com `include` direto (ex.: `tasks.prisma.repository.ts:WITH_RELATIONS` → `TaskWithRelations` cru no controller).
**Impacto (acoplamento/escala):** qualquer mudança de schema vaza para o contrato da API e para o front; campos internos podem escapar sem querer.
**Correção:** um mapper de saída por módulo (como projects). Não precisa ser elaborado — KISS, só a fronteira.

**A6 — `before` nunca capturado na auditoria** *(persiste da 1ª passagem)*
`audit.interceptor.ts:62` grava só `after`. Para "o que mudou", `before` é tão necessário quanto. O interceptor HTTP não tem o estado anterior — precisa ser instrumentado nos use-cases de update.
**Correção (incremental):** popular `before` nos use-cases de update que importam (charter approve, project status, task status), via `AuditService.log()` explícito.

**A7 — `process.env` espalhado sem camada de config validada**
`main.ts:9,15`, `jwt-token.service.ts:25,34`, `ConfigModule.forRoot({ isGlobal:true })` **sem `validationSchema`**. Não há garantia de startup de que `DATABASE_URL`/secrets existam.
**Correção:** schema de validação no `ConfigModule` + injetar `ConfigService` em vez de `process.env` (resolve A3 junto).

---

### 🔵 Baixo

**A8 — Sem filtro global de exceção** — erros de domínio viram 500 genérico sem shape padronizado. Um `AllExceptionsFilter` daria respostas de erro consistentes para o front (que hoje faz `err.message ?? 'Erro'`). Logging de request já existe no `AuditInterceptor`.

**A9 — `import { Reflector }` morto em `main.ts:1`** *(persiste da 1ª passagem)* — viola a convenção "sem imports não usados".

---

## 4. Prontidão para escala

| Aspecto | Estado | Risco com muitos módulos |
|---|---|---|
| Posse de sub-recurso (A1/A2) | 🔴 só risks valida | cada módulo novo replica o IDOR; vira regra, não exceção |
| Mapper de saída (A5) | 🟡 só projects | contrato da API colado no schema em todo o backend |
| Config/secrets (A3/A7) | 🟠 `process.env` cru | cada serviço novo replica o padrão sem validação |
| `resolveEntity` (A4) | 🟠 quebrado p/ cuid | auditoria cresce inútil; retrofit fica caro |
| Guards globais | ✅ um lugar | escala bem — manter |
| Comunicação inter-módulo | ✅ via Prisma compartilhado | quando um módulo precisar de outro, passar por porta/interface |

---

## 5. Top 3 ações (próxima sessão)

1. **Escopar todo acesso a sub-recurso pelo `projectId`** (A1 + A2) — começar pelo `GetTaskUseCase` (vazamento real p/ `CLIENTE`), depois checklist e dependências. Padrão já existe em `UpdateRiskUseCase`; só replicar.
2. **`validationSchema` no `ConfigModule` + injetar `ConfigService`** (A3 + A7) — falha segura no startup, fim do `process.env` cru.
3. **Corrigir `resolveEntity` com regex de cuid** (A4) — ~10 linhas, devolve utilidade à trilha de auditoria.

> **Resolvido/melhorado desde a 1ª passagem:** mapper de saída em projects (`toProjectDto`); CORS via env com allowlist (`main.ts`); `ProjectAccessGuard` registrado globalmente. **Persistem:** A3 (secret via env), A4 (resolveEntity cuid), A6 (before), A9 (Reflector morto). **Novos:** A1 (cross-project read em task), A2 (IDOR latente em sub-recursos), A5 (mapper só em projects), A7/A8.
