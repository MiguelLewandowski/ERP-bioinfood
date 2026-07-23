# Análise de Frontend — ERP Bioinfood

> **Data:** 2026-07-20 (7ª passagem) · **Alvo:** `apps/web/app` + `apps/web/components` + `apps/web/lib`
> **Revisor:** Tech Lead Frontend (skill `/analisar-frontend`)
> **Estado:** branch `feat/crm-empresa-pessoa-negocio-tarefas`. As correções da 6ª passagem (badges/mapas de status, charter PDF, Zod compartilhado) foram **verificadas e persistem**. Esta passagem olhou eixos que as anteriores não cobriram (consistência de token além dos badges, drift de tipo/estrutura) e **corrige duas afirmações da 6ª passagem que estavam superestimadas**.

---

## 1. Resumo (7ª passagem)

A espinha dorsal continua sólida — camada de dados única e tipada, RSC→client, `loading`/`error` em toda rota, Zod compartilhado, optimistic com rollback. As últimas passagens fecharam bem o drift **dentro do escopo que mediram** (badges, mapas de status/prioridade, template de PDF do charter). Ampliando a lente, aparecem dois tipos de dívida que ninguém tinha medido:

1. **Consistência de cor além dos badges.** O guard-rail de hex (ESLint) só cobre `className`/`style` — e o código acumula **328 classes de paleta Tailwind crua** (`bg-gray-*`, `bg-white`…) que passam pelo lint intactas, além de hex solto em dados JS/atributos SVG (kanban, funil, heatmap, charter), incluindo dois vermelhos **fora da paleta da marca**. A vitória de "hex → 0" era real **só para badges/className**; a regra nº 1 ("cor sempre por token") ainda erode fora dali.
2. **Correção de duas afirmações da 6ª passagem:** (a) "sem `any` de contrato" — `project-card.tsx` (arquivo que a própria 6ª passagem migrou para `StatusBadge`) ainda tipa `project: any`; (b) o padrão canônico de dados (`api-hooks` tipado) é furado por 6 telas de projeto que chamam `api.patch('/path…')` cru.

**Nenhum 🔴 Crítico.** Um 🟠 Alto (consistência de token em escala) e quatro 🟡 Médio de drift estrutural.

---

## 2. Pontos fortes (preservar)

- ✅ **Camada de dados fechada** — `lib/api.ts` (wrapper único com 401→refresh→retry) + `lib/api-hooks.ts` tipado com DTOs de `@bioinfood/shared`. `fetch` cru só nas rotas BFF de auth.
- ✅ **Badges/mapas de status unificados (6ª passagem, confirmado)** — 0 mapas `STATUS_COLORS`/`PRIORITY_CONFIG` locais; `StatusBadge`/`PriorityBadge` adotados em 10 arquivos. **Persiste.**
- ✅ **Zod compartilhado (6ª passagem, confirmado)** — `packages/shared/src/schemas.ts` com `projectSchema`/`organizationSchema`/`opportunitySchema`, fonte única de limites (DTOs replicam com comentário cruzado). **Persiste.**
- ✅ **`lib/charter-report.ts` (6ª passagem, confirmado)** — template de PDF fora do client, função pura reusando `printHtml()`. **Persiste.**
- ✅ **RSC → Client** — página busca com o cookie token e passa dados prontos; `use client` reservado a interação.
- ✅ **Proteção de rota centralizada** — `proxy.ts` (refresh proativo + gate `must_change_password`).
- ✅ **Optimistic com rollback** — `kanban-client.tsx:63-71` (reverte + `toast.error`). Padrão a replicar.
- ✅ **Token no client documentado** como tradeoff consciente (`auth-provider.tsx:11-19`).

---

## 3. Achados por severidade (7ª passagem)

### 🟠 A3 — Consistência de token além dos badges: guard-rail com furos + paleta crua em escala
O ESLint (`eslint.config.mjs:14-29`) só barra hex em `className` e `style`. Fica de fora:
1. **Paleta Tailwind crua** — `bg-gray-*`/`bg-white`/`text-gray-*`/`border-gray-*`: **328 ocorrências** em `app`+`components`. Passam pelo lint (não são hex) mas violam a regra nº 1. Tokens equivalentes já existem: `bg-card`←`bg-white`, `border-border`←`border-gray-200`, `bg-muted`←`bg-gray-50`, `text-primary-foreground`←`text-white`. Concentração em `project-card.tsx`, `projects-client.tsx`, `sidebar.tsx`, formulários de auth.
2. **Hex em dado JS / atributo SVG** — `kanban-client.tsx:29` (`#46AD48`, existindo o token `success`; as outras 2 colunas usam `hsl(var(--…))`), `funis-client.tsx:29-32`, `charter-client.tsx:116,149`, `risk-heatmap.tsx:12-13`, `contatos-tab.tsx:203` (`fill="#DD8005"`). **`#C0392B` (funis) e `#D64550` (heatmap) não estão na paleta da marca** — deviam ser `destructive`.
- **Impacto (consistência/escala):** cada tela nova copia `bg-gray-*` e o "um sistema só" degrada; a 6ª passagem declarou hex resolvido, o que dá falsa confiança fora dos badges. É o eixo nº 1 num projeto que se define por tokens.
- **Correção:** (a) estender o seletor do lint para hex em **qualquer** `Literal`/`TemplateElement`, não só em `className`/`style`; (b) regra contra `-(gray|slate|zinc|neutral|stone)-\d` em `className`; (c) varredura grays→tokens e reds off-palette→`destructive`; (d) cor que precisa ser valor JS (kanban/heatmap/gantt/SVG) lida de CSS var, não hex literal.

### 🟡 A4 — Drift de tipo `any` em componente de domínio (corrige "sem any de contrato")
`components/projects/project-card.tsx:8` (`project: any`) e `:51` (`a: any`), apesar de o pai `projects-client.tsx` passar `ProjectDto`. É a única exceção de contrato fora da fronteira SVAR — e num arquivo que a 6ª passagem tocou (migrou para `StatusBadge`) sem tipar.
- **Impacto:** apaga o contrato de `@bioinfood/shared` na fronteira; rename de campo no DTO não quebra o card.
- **Correção:** `project: ProjectDto`. *(Os `any` do módulo gantt são fronteira da lib SVAR — ver A7.)*

### 🟡 A5 — CTA de botão remarcado à mão em vez do `<Button>`
~31 arquivos montam o CTA primário inline (`<button className="… bg-primary text-white">` ou `style={{ backgroundColor: 'hsl(var(--primary))' }}`), ex.: `projects-client.tsx:98-104,153-159`, `kanban-client.tsx:87-93`. O `<Button>` existe e é usado no mesmo arquivo (ExportModal).
- **Impacto (reuso/design):** duplicação que o `design-tokens.md` proíbe; cada cópia é vetor de drift de cor e de `hover/focus/disabled` inconsistente.
- **Correção:** funilar CTAs pelo `<Button>`.

### 🟡 A6 — Telas furam a camada `api-hooks` tipada
6 arquivos de projeto importam `@/lib/api` cru e chamam `api.patch('/projects/.../tasks/...')` com path hardcoded e body `unknown` (17 chamadas): `kanban-client.tsx:67`, `backlog-client`, `risks-client`, `roadmap-client`, `project-settings-client`, `task-form-dialog`.
- **Impacto (desacoplamento):** a `api-hooks` centraliza path+tipo; furá-la reacopla URL na tela e perde a tipagem do body — rename de rota não é pego pelo compilador.
- **Correção:** usar `tasksApi.update(projectId, id, { status }, token)` etc. (métodos já existem).

### 🟡 A7 — Estado de servidor em `useState` local sem cache compartilhado
`kanban`/`backlog`/`gantt`/`roadmap` recebem `initialTasks` do RSC e mantêm cópia independente em `useState`, mutada localmente sem `router.refresh()` (`kanban-client.tsx:40,74-76`); sem camada de cache (React Query/SWR).
- **Impacto (estado/escala):** dentro da visão funciona; entre visões da mesma tarefa há drift até renavegar, e cada visão reimplementa optimistic à mão.
- **Correção (quando incomodar):** avaliar React Query/SWR ou padronizar `router.refresh()` pós-mutação. YAGNI hoje; é a dívida de estado a resolver antes da próxima onda grande de telas.

### 🔵 A8 — `any` na fronteira da lib SVAR (gantt)
`gantt-*` concentra os `any` restantes (lib fracamente tipada). Aceitável; **correção:** isolar num adapter tipado para o resto do módulo não ver `any`.

### 🔵 A9 — `style` inline com token onde a classe resolve
`kanban-client.tsx:90`, `project-card.tsx:55` usam `style={{ backgroundColor: 'hsl(var(--primary))' }}` onde `className="bg-primary"` bastaria — workaround que só reduz legibilidade.

---

## 4. Prontidão para escala

| Risco | 6ª passagem | 7ª passagem (hoje) |
|---|---|---|
| Hex em badge / className | 0 ✅ | 0 ✅ (persiste) |
| Mapas status/prioridade locais | 0, 1 fonte ✅ | 0 ✅ (persiste) |
| Zod compartilhado (3 forms) | ✅ | ✅ (persiste) |
| Charter form/PDF separados | ✅ | ✅ (persiste) |
| **Cor por token além de badges** | não medido | 🟠 **A3** — 328 grays crus + hex off-palette |
| **`any` de contrato** | declarado "0" | 🟡 **A4** — `project-card` ainda `any` |
| **Reuso do `<Button>`** | não medido | 🟡 **A5** — ~31 CTAs à mão |
| **Disciplina da `api-hooks`** | não medido | 🟡 **A6** — 6 telas furam com path cru |
| **Estado de servidor** | não medido | 🟡 **A7** — `useState` local, sem cache |

**O que dói com muitos módulos:** sem fechar A3/A5/A6, cada módulo novo copia o padrão errado (gray cru + botão inline + `api.patch` hardcoded) e a correção fica exponencialmente mais cara.

---

## 5. Top 3 ações priorizadas

1. **🟠 A3 — Fechar o guard-rail de cor e varrer o drift.** Estender o lint para hex em qualquer atributo/objeto + regra contra Tailwind grays; codemod grays→tokens e reds off-palette (`#C0392B`/`#D64550`)→`destructive`.
2. **🟡 A5 + A6 — Estancar os dois vetores de drift estrutural** (CTA pelo `<Button>`, dados pela `api-hooks`) antes da próxima onda de telas.
3. **🟡 A4 — Tipar `project-card`** e reafirmar a checagem de `any` de contrato como invariante (a "vitória" declarada só é verdadeira depois disso).

---

## 6. Considerado e OK (não é achado)

- **`activities-client.tsx` faz fetch client-side em `useState`** (`:53,62-70`): justificado — calendário com navegação de período sem renavegar a rota.
- **`getSession`/`proxy` decodificam o JWT sem verificar assinatura**: só gate de UI + `exp`; authz real no backend. Tradeoff documentado.
- **`dados-tab.tsx` (633) / `task-form-dialog.tsx` (695)**: grandes mas coesos; dividir só se voltarem a crescer.
- **Sem paginação** em projects/users/backlog/empresas: irrelevante no volume atual (~12 usuários).

---

## 7. Histórico — Correções da 6ª passagem (2026-07-19), verificadas e persistindo

- **A1+M3** — `PriorityBadge` criado espelhando `StatusBadge`; 6 telas migradas; hex de badge eliminado; escala de prioridade unificada (Alta/Crítica não mudam mais de cor entre Atividades e Kanban/Backlog).
- **M2** — template de PDF do charter extraído para `lib/charter-report.ts` (função pura + `printHtml()` compartilhado).
- **M1** — `schemas.ts` estreou com 3 schemas; achado real corrigido: `Project.name` não tinha limite no Nest enquanto o form limitava a 200.
- **Débito herdado ainda aberto:** Zod local em ~9 forms restantes; Nest sem `ZodValidationPipe` real (limites alinhados manualmente com comentário cruzado). Reavaliar quando o drift de limite reaparecer.
