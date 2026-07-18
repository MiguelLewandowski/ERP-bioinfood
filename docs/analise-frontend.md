# Análise de Frontend — ERP Bioinfood

> **Data:** 2026-07-17 (4ª passagem) · **Alvo:** `apps/web/app` + `apps/web/components` (98 arquivos)
> **Revisor:** Tech Lead Frontend (skill `/analisar-frontend`)
> **Estado:** onda CRM consolidada (clientes/crm/config), Gantt SVAR, calendário de atividades, gestão de usuários. Camada de dados adotada nos clients; server pages ainda fora dela.

---

## 1. Resumo

Duas correções da 3ª passagem pegaram de verdade: **`api-hooks.ts` deixou de ser código morto** (19 arquivos importam) e **`router.refresh()` virou hábito** (14 arquivos) — C1 e A3 caíram pela metade ou mais. Em compensação, **dois achados regrediram de forma acentuada**: hex hardcoded saltou de 334/24 arquivos para **955/66**, e os modais hand-rolled foram de 3 para **17**.

O ponto central desta passagem é o **porquê** dessa regressão. Não é desleixo: `docs/design/design-tokens.md:27-54` documenta `bg-[#147F23]` como "Classes Tailwind Mapeadas", ou seja, **a própria fonte de verdade de design manda escrever hex** — enquanto `tailwind.config.ts:46-54` define `brand.*` que ninguém usa (**0 ocorrências**). E não existe `components/ui/` — a base shadcn/ui prometida no `CLAUDE.md` nunca foi criada, então cada onda reinventa o overlay. **Enquanto o doc e a base de componentes não mudarem, toda onda nova vai continuar somando hex e modal.**

---

## 2. Pontos fortes (preservar)

- ✅ **`api-hooks.ts` adotado nos clients** (19 importadores: todo o CRM, charter, stakeholders, gantt, settings, activities). O investimento da 3ª passagem rendeu — C1 deixou de ser "código morto".
- ✅ **`router.refresh()` após mutação em 14 arquivos** — A3 deixou de ser sistêmico; o drift entre telas virou exceção.
- ✅ **Tipos do contrato unificados em `@bioinfood/shared`** — `api-hooks.ts:2-31` importa 25+ DTOs; nenhum `any` de domínio.
- ✅ **`loading.tsx`/`error.tsx` existem** em `clientes/[id]`, `clientes/config`, `crm`, `crm/config`, `projects/[id]/charter` (10 arquivos) — o padrão está estabelecido, falta estender.
- ✅ Server Components fazem o fetch inicial; Client Components só interagem. `use client` justificado.
- ✅ Optimistic update com rollback no Kanban — segue sendo o padrão de referência.

---

## 3. Achados por severidade

### 🟠 Alto

**A1 — Hex hardcoded quase triplicou (334→955 em 66 arquivos); `brand.*` tem 0 usos — e o doc de design é a causa raiz** *(regrediu)*
`tailwind.config.ts:46-54` define `brand.green/#147F23`, `brand-green-dark`, `brand.orange` etc. Busca por `(bg|text|border)-brand-*` em `app/` + `components/`: **zero ocorrências**. Enquanto isso há **955 hex** em 66 arquivos e **100 `style={{...}}` inline**.
**A causa não é o código, é o doc:** `docs/design/design-tokens.md:27-54` traz uma seção "Classes Tailwind Mapeadas" que lista literalmente `bg-[#147F23]`, `text-[#575756]`, `border-[#52B552]`… O `CLAUDE.md` manda ler esse arquivo **antes de criar qualquer componente de UI**. Ou seja: o processo está funcionando como desenhado — e ensinando a hardcodar hex a cada onda. Por isso triplicou.
**Impacto (design/escala):** a paleta é efetivamente imutável (955 pontos de edição); `style={{}}` inline ainda impede `hover:`/`focus:`/`disabled`.
**Correção (nesta ordem, ou não adianta):** (1) reescrever a seção "Classes Tailwind Mapeadas" do `design-tokens.md` para listar `bg-brand-green`, `text-brand-gray-mid` etc.; (2) completar `brand.*` no `tailwind.config.ts` com os tons que faltam (`green-500/300`, escala amber, grays); (3) migrar por módulo, começando pelos mais quentes; (4) proibir hex e `style={{backgroundColor}}` no review. **O passo 1 é o que impede a regressão de voltar.**

**A2 — `loading.tsx`/`error.tsx` só em 5 dos ~14 segmentos; server fetch ainda engole erro (13 swallow × 1 throw)** *(parcial — inalterado desde a 3ª passagem)*
Cobertos: `clientes/[id]`, `clientes/config`, `crm`, `crm/config`, `charter`. **Descobertos:** `projects`, `projects/[id]/{kanban,gantt,backlog,risks,wbs,roadmap,settings,stakeholders}`, `users`, `activities`.
O padrão `if (!res.ok) return fallback` aparece **13 vezes** (`kanban/page.tsx:11` é o arquétipo) contra **1** `throw`. API fora do ar → a tela renderiza "Nenhuma tarefa" em vez de erro.
**Impacto (UX):** falso-vazio silencioso nas telas de projeto — justamente as de uso diário. O usuário não distingue "não há tarefas" de "a API caiu".
**Correção:** deixar o `throw` borbulhar para o `error.tsx` e criar os dois arquivos por segmento faltante. Resolve-se junto com A3 (o helper compartilhado já lança).

**A3 — C1 pela metade: os 19 clients usam `api-hooks`, mas as 21 server pages seguem com `fetch` cru** *(parcialmente resolvido — o restante é nítido)*
`kanban/page.tsx:6-13` define `fetchJson` local e chama `/projects/${id}/tasks` na linha 26 — **enquanto `api-hooks.ts:36` já expõe `tasksApi.list(projectId, token)` com exatamente essa rota, tipada**. O mesmo helper `fetchJson`/`fetch` cru está copiado em `projects/page.tsx:6`, `backlog/page.tsx:7`, `risks/page.tsx:7`, `wbs/page.tsx:5`, `roadmap/page.tsx:5`, `settings/page.tsx:5`, `stakeholders/page.tsx:5`, `charter/page.tsx:6,17`, `gantt/page.tsx:7`, `layout.tsx:7`, `users/page.tsx:8`, `clientes/*`, `crm/*`. `NEXT_PUBLIC_API_URL` aparece direto em **21 arquivos**.
`wbs-client.tsx:74,103` é o caso pior: **client component** com `fetch` cru e `NEXT_PUBLIC_API_URL`, fora do padrão que os outros 19 clients já seguem.
**Impacto (acoplamento/escala):** a rota está escrita à mão em ~15 lugares; trocar um endpoint ou header ainda obriga a caçar strings. Metade do ganho de `api-hooks` está na mesa.
**Correção:** server pages passam a chamar `tasksApi.list(id, token)` etc. e apagam os `fetchJson` locais. Onde faltar método no `api-hooks`, adicionar. Migrar `wbs-client.tsx` junto.

---

### 🟡 Médio

**M1 — 17 modais hand-rolled e `components/ui/` não existe** *(regrediu de 3 → 17)*
`fixed inset-0` em 17 arquivos: `activity-detail.tsx`, `day-detail.tsx`, `crm-client.tsx`, `opportunity-dialog.tsx`, `charter-client.tsx`, `risks-client.tsx`, `roadmap-client.tsx`, `stakeholders-client.tsx`, `wbs-client.tsx`, `task-form-dialog.tsx`, `cliente-dialog.tsx`, `project-dialog.tsx`, `projects-client.tsx`, `confirm-dialog.tsx`, `reset-password-dialog.tsx`, `user-dialog.tsx`, `user-project-access-dialog.tsx`.
**A causa raiz é estrutural:** `@radix-ui/react-dialog` está no `package.json:17`, o `CLAUDE.md` declara shadcn/ui na stack — mas **não existe diretório `components/ui/`**. Sem uma base para reusar, cada onda hand-rolla o overlay de novo. Nenhum tem focus trap, `Esc`, `role="dialog"`/`aria-modal`.
**Impacto (a11y/consistência):** 17 divergências do mesmo overlay; teclado escapa do modal; leitor de tela não anuncia. Cresce 1:1 com o nº de telas.
**Correção:** criar `components/ui/dialog.tsx` sobre o Radix (já instalado) e migrar os 17. Mesmo raciocínio do A1 — **sem a base, a regressão volta**.

**M2 — Schemas Zod duplicados por formulário** *(persiste, era B1)*
Cada form redefine seu schema local; regras podem divergir do `ValidationPipe` do NestJS.
**Correção:** exportar de `packages/shared` e importar dos dois lados. `packages/shared/src` só tem `index.ts` hoje — cabe um `schemas.ts`.

**M3 — Pendências herdadas do TAP** *(persistem da 3ª passagem)*
Sem aviso de alterações não salvas ao sair; `specificObjectives`/`deliverables` seguem texto opaco em vez de lista estruturada.

---

### 🔵 Baixo

**B1 — `project-skeleton.tsx` órfão** — usar nos `loading.tsx` de A2.
**B2 — Sem paginação** em `projects`, `users`, `backlog`, `clientes` — irrelevante hoje, relevante a partir de ~200 registros. `users/page.tsx:8` já cravou `?limit=100` à mão.

---

## 4. Prontidão para escala (muitos módulos)

| Risco | 3ª passagem | Hoje | Ao multiplicar módulos |
|---|---|---|---|
| Hex hardcoded | 334 / 24 arq. | **955 / 66 arq.** 🔺 | paleta imutável; o doc **ensina** a piorar |
| Modal hand-rolled | 3 | **17** 🔺 | sem `components/ui/`, cada tela nova = +1 cópia sem a11y |
| `api-hooks` ignorado | ~16 calls cruas | **21 server pages** ⚠️ | metade do ganho na mesa; rotas à mão |
| `loading`/`error.tsx` | 0 rotas | **5 de ~14** ✅ | padrão existe; falta estender |
| `useState` sem refresh | 5 clients | **14 arq. c/ refresh** ✅ | resolvido na prática |
| Tipos do contrato | shared ✅ | shared ✅ | escala bem — manter |

---

## 5. Top 3 ações priorizadas

1. **Consertar a causa raiz do drift de design** (A1) — reescrever "Classes Tailwind Mapeadas" no `design-tokens.md` para tokens `brand.*`, completar o `tailwind.config.ts` e só então migrar. Enquanto o doc disser `bg-[#147F23]`, a 5ª passagem vai contar 1500 hex.
2. **Criar `components/ui/dialog.tsx` sobre o Radix e migrar os 17 overlays** (M1) — mesma lógica: a base ausente é o que gera a cópia. Ganho de a11y imediato.
3. **Terminar o C1: server pages → `api-hooks`** (A3) + deixar o erro borbulhar, fechando A2 junto. `tasksApi.list` já existe e `kanban/page.tsx` a ignora — é adoção, não design.

> **Resolvido/melhorado desde a 3ª passagem:** C1 nos clients (19 importadores); A3-estado (14 × `router.refresh`); `loading`/`error.tsx` de 0 → 10 arquivos; achados do TAP (C2, C3, A4, A5, A6, A7) confirmados corrigidos.
> **Regrediram:** A1 (hex 334→955), M1 (modais 3→17) — ambos por **ausência de base/doc correto**, não por descuido pontual.
> **Leitura de tendência:** o que foi corrigido *com uma base para reusar* (api-hooks, shared types) **grudou** e se espalhou sozinho. O que foi corrigido *só por revisão manual* (hex, modais) **regrediu na onda seguinte**. A lição para a próxima sessão: corrigir a base e o doc primeiro; migração depois.
