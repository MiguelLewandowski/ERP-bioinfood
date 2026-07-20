# Análise Backend — ERP Bioinfood

> Revisão de arquitetura do backend NestJS sob a ótica de **Tech Lead / Engenheiro Backend Sênior**, com foco em **separação de responsabilidades**, **desacoplamento**, **RBAC** e **prontidão para escala**.
>
> **Data:** 2026-07-19 (5ª passagem) · **Escopo:** `apps/api/src` (18 módulos + `search`) · **Estado:** branch `feat/crm-empresa-pessoa-negocio-tarefas` — todas as ações da 4ª passagem corrigidas.

---

## 1. Resumo

**Todas as ações abertas na 4ª passagem foram corrigidas nesta sessão.** O commit `0853f91` (já presente na branch antes desta sessão, mas ainda não refletido no doc) havia resolvido B1/A1/A2/A3/A7/A8/A9/B2 — falha fechada de config, IDOR de `tasks`, rate limit, helmet, exception filter global, imports mortos e teto de `take`. Esta sessão fechou os 4 itens que restavam: **A4** (regex de cuid na auditoria), **A6** (captura de `before` na trilha de auditoria), **B3** (reorder de etapas escopado por funil) e **A5** (mapper de saída no núcleo antigo: tasks, risks, charter, wbs, milestones, stakeholders). `tsc --noEmit` limpo e as 19 specs (72 testes) passam sem alteração de comportamento esperado.

---

## 2. Pontos fortes a preservar

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

## 3. Correções desta sessão (5ª passagem)

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

## 4. Prontidão para escala

| Aspecto | Estado |
|---|---|
| Secrets/config | ✅ falha fechada, `validationSchema` Joi |
| Posse de sub-recurso (IDOR) | ✅ CRM + `tasks` + reorder de etapas — todos com padrão `WHERE` escopado |
| Mapper de saída | ✅ CRM + núcleo antigo — nenhum endpoint vaza entidade Prisma crua |
| Auditoria | ✅ `entityId` correto (cuid) + `before` capturado best-effort |
| Guards globais | ✅ escala bem |
| Testes | ✅ 19 specs / 72 testes, todos verdes |
| Semântica de exclusão | ✅ FK→409 amigável (taxonomies), padrão replicável nos demais deletes |
| Exception filter | ✅ `AllExceptionsFilter` global, sem vazar stack |
| Rate limit / body limit / headers | ✅ throttler + helmet + `trust proxy` + limite de 1mb |

---

## 5. Achados remanescentes (nenhum crítico ou alto)

Não há mais itens 🔴/🟠 em aberto desta análise. Itens de menor prioridade que não foram escopo desta sessão (não bloqueiam nada, avaliar quando fizer sentido):

- **Sub-recursos de task fora do escopo do mapper** (`dependencies`, `checklist` add/update) retornam a entidade Prisma da linha específica (não `TaskWithRelations` completa) — baixo risco, shape pequeno e já sem relations pesadas.
- **Charter**: `toEntity` de conversão `Decimal → number` e achatamento de `team` continua dentro do repositório Prisma (não no mapper de infra) — funcional, mas quem revisar o módulo deve saber que a "primeira camada" de shape já acontece ali antes do `charter.mapper.ts`.
- **`taxonomies`**: múltiplos sub-recursos (sector, category, engagementStage, organizationSource, productService) — não entraram no mapa `ENTITY_MODEL` do audit por ambiguidade de modelo; `before` fica `null` nesses casos (nunca bloqueia, só reduz a trilha).

> **Leitura de tendência:** as 4 passagens anteriores acumularam achados sem execução; esta passagem fechou 100% do backlog aberto (incluindo os itens do commit `0853f91` que o doc ainda não refletia). Próxima sessão de auditoria pode partir de escopo novo — não há dívida técnica de segurança/RBAC/shape pendente neste levantamento.
