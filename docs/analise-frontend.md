# Análise de Frontend — ERP Bioinfood

> **Data:** 2026-07-19 (6ª passagem) · **Alvo:** `apps/web/app` + `apps/web/components` (~110 arquivos)
> **Revisor:** Tech Lead Frontend (skill `/analisar-frontend`)
> **Estado:** todas as ações abertas na 5ª passagem (A1, M1, M2, M3) corrigidas nesta sessão. A2 já havia sido resolvida na sessão de segurança anterior (commit `0853f91`) e o doc ainda não refletia isso.

---

## 1. Resumo

**As duas últimas passagens tinham a mesma tese: corrigir a base faz a correção grudar.** Depois de hex (955→44) e modais (17→1) terem regredido e sido corrigidos de novo na 5ª passagem, esta sessão fechou a última fonte de drift identificada: os mapas de status/prioridade duplicados por tela. `PriorityBadge` foi criado em `components/ui/` seguindo o mesmo padrão de `StatusBadge`, e as 6 telas que redefiniam cor/rótulo localmente (`projects-table`, `project-card`, `clientes-client`, `charter-client`, `kanban-card`, `backlog-row`) passaram a importar da fonte única. De brinde, a inconsistência real de cor entre telas (prioridade "Alta" era âmbar em Atividades e verde no Kanban) desapareceu — a escala canônica agora é uma só, alinhada aos tokens semânticos de `design-tokens.md`. `charter-client.tsx` caiu de 703 para uma versão sem o template de PDF embutido (extraído para `lib/charter-report.ts`, reusando `printHtml()` que já existia). E `packages/shared/src/schemas.ts` estreou com os 3 schemas de formulário mais editados (projeto, empresa, oportunidade), agora importados tanto pelo `zodResolver` do web quanto referenciados nos limites dos DTOs do Nest.

---

## 2. Pontos fortes (preservar)

- ✅ **Camada de dados fechada**: `lib/api.ts` + `lib/api-hooks.ts` tipado com DTOs de `@bioinfood/shared`. Zero `fetch` cru fora de auth.
- ✅ **`components/ui/` como fonte única de UI reutilizável**: 16 primitivos agora, incluindo `status-badge.tsx` e o novo `priority-badge.tsx`. Nenhuma tela redefine cor de status/prioridade localmente.
- ✅ **`loading.tsx` em 17 segmentos + 17 `error.tsx`**.
- ✅ **Middleware de auth centralizado** — rota protegida por padrão, refresh proativo.
- ✅ **Token no client documentado como tradeoff consciente** (`CLAUDE.md` + comentário em `auth-provider.tsx`, ver `docs/analise-seguranca.md` S3) — resolvido desde a sessão de segurança anterior.
- ✅ **`packages/shared` agora tem schemas Zod reais** (`schemas.ts`), não só tipos — usados nos 3 forms mais editados do CRM/projetos.
- ✅ **`lib/charter-report.ts`** segue o mesmo padrão de função pura de `lib/project-report.ts` (`buildCharterHtml` recebe dados, devolve string; efeito colateral de impressão fica em `printHtml()`, compartilhado entre os dois).
- ✅ Tipos de domínio 100% de `@bioinfood/shared` — sem `any` de contrato, sem drift de DTO.

---

## 3. Correções desta sessão (6ª passagem)

**A1 + M3 — Mapas semânticos de status/prioridade unificados** *(RESOLVIDO)*
`components/ui/priority-badge.tsx` criado, espelhando `status-badge.tsx`: mapa central `LOW→neutral, MEDIUM→success, HIGH→accent, CRITICAL→destructive` — cores derivadas da tabela de-para de `design-tokens.md`, que por sua vez já batiam com a escala de `lib/activities.ts` (fonte legítima da feature de Atividades, nunca duplicada, só desalinhada do kanban/backlog). Migrados para os componentes centrais:
- `projects-table.tsx`, `project-card.tsx`, `clientes-client.tsx` → `StatusBadge` (apagados os `STATUS_COLORS`/`STATUS_LABELS` locais).
- `kanban-card.tsx`, `backlog-row.tsx` → `PriorityBadge` + `StatusBadge` (apagados `PRIORITY_CONFIG`/`STATUS_CONFIG`, inclusive o hex hardcoded que violava a regra de tokens).
- `charter-client.tsx` → importa `PROJECT_STATUS_LABELS` de `lib/project-report.ts` em vez de redeclarar.
- `status-badge.tsx` ganhou a entrada `TODO` que faltava no mapa central (única lacuna real ao migrar `backlog-row.tsx`).
Efeito colateral corrigido: a mesma prioridade "Alta"/"Crítica" não muda mais de cor entre Atividades e Kanban/Backlog.

**M2 — `charter-client.tsx` misturava formulário + gerador de PDF inline** *(RESOLVIDO)*
`buildPrintHtml` (template HTML/CSS de ~200 linhas) extraído para `lib/charter-report.ts` como `buildCharterHtml`, função pura `(values, sectionIds, members, sections) → string`. `handleExport()` no client agora só monta os dados e chama `printHtml()` (reusado de `lib/project-report.ts`, eliminando uma segunda implementação de `window.open`/`print` que já existia duplicada dentro do próprio `charter-client.tsx`).

**M1 — Schemas Zod locais, sem fonte compartilhada com o backend** *(RESOLVIDO nos 3 forms mais editados)*
`packages/shared/src/schemas.ts` (novo, com `zod` como dependência real do pacote): `projectSchema`, `organizationSchema`, `opportunitySchema` — migrados de `project-dialog.tsx`, `cliente-dialog.tsx` (que já tinham Zod local, agora removido) e `opportunity-dialog.tsx` (que **não tinha nenhuma validação além de `required: true` no título** — ganhou validação real pela primeira vez).
Do lado do Nest, os limites de `CreateProjectDto`/`UpdateProjectDto` foram alinhados aos do schema — achado concreto: `name` do projeto **não tinha limite nenhum** no backend enquanto o form limitava a 200 caracteres (exatamente o drift que o doc alertava). `CreateOrganizationDto`/`CreateOpportunityDto` já batiam com os limites do schema; ganharam só o comentário apontando `schemas.ts` como fonte de verdade.
**Não fiz** (fora de escopo desta sessão, ver §5): substituir `class-validator` por um pipe Zod real no Nest — o `ValidationPipe` global usa `whitelist: true`, que depende dos decorators do DTO para saber quais campos manter; trocar isso exigiria uma pipe dedicada e testá-la em todos os endpoints tocados, risco maior que o resto da sessão. Os limites estão alinhados manualmente com comentário cruzado; ainda pode divergir se alguém mudar só um lado.

---

## 4. Prontidão para escala (muitos módulos)

| Risco | 5ª passagem | Hoje |
|---|---|---|
| Hex hardcoded em badge de UI | kanban/backlog com hex cru | **0** — via `PriorityBadge`/`StatusBadge` ✅ |
| Mapas status/prioridade locais | ~9 arq. cada, 2 escalas conflitantes | **0 cópias, 1 fonte por conceito** ✅ |
| `charter-client.tsx` | 703 linhas, form + PDF juntos | form e template separados ✅ |
| Zod compartilhado | 0 usos em `packages/shared` | **3 schemas** (projeto, empresa, oportunidade) ✅ |
| Drift de limite front/back | não verificado | 1 achado real corrigido (`Project.name` sem limite no Nest) ✅ |
| Token no client | tradeoff não documentado | documentado (`CLAUDE.md` + `auth-provider.tsx`) ✅ |
| Tipos do contrato | shared ✅ | shared ✅ |

---

## 5. Achados remanescentes (nenhum crítico ou alto)

- **Zod ainda local em ~9 forms restantes** (task-form-dialog, stakeholders, risks, roadmap, user-dialog, login/change-password, reset-password, project-settings) — não migrados nesta sessão; candidatos naturais para a próxima onda, mesmo padrão já provado.
- **Nest sem pipe Zod real** — limites alinhados manualmente com comentário cruzado (`packages/shared/src/schemas.ts` ⇄ DTO), mas nada impede divergência futura automaticamente. Migrar para um `ZodValidationPipe` por rota é o próximo passo se o drift voltar a aparecer nas próximas passagens — não fiz agora por exigir revalidar o comportamento do `whitelist: true` global.
- **`dados-tab.tsx` (633 linhas) e `task-form-dialog.tsx` (581)** — grandes mas coesos, mesmo status da 5ª passagem; dividir só se voltarem a crescer.
- **Sem paginação** em projects/users/backlog/empresas — irrelevante no volume atual (~12 usuários).

> **Leitura de tendência:** confirma a tese das últimas duas passagens — toda vez que a correção cria uma base reutilizável (`components/ui/`, `packages/shared/src/schemas.ts`), ela gruda; toda vez que fica sem base (Nest ainda com validação duplicada manualmente), o risco de regressão continua. Próxima sessão de arquitetura pode avaliar se vale o custo de fechar esse último elo (pipe Zod no Nest) ou se o comentário cruzado é suficiente para o tamanho do time.
