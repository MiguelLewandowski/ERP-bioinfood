# Análise de UI/UX — tela de Atividades

**Data:** 2026-07-30 · **Escopo:** `apps/web/app/(dashboard)/activities/` (`activities-client.tsx`,
`month-calendar.tsx`, `activity-detail.tsx`, `day-detail.tsx`, `activities-filters.tsx`),
`components/activities/activity-card.tsx` e `lib/activities.ts`.

> **Método: renderização real.** `pnpm dev` no ambiente local, logado como ADMIN
> (`admin@bioinfood.com`), com o banco de demonstração. Foram inspecionados: visão
> Mês (mês inteiro, rolado), visão Semana, modal de detalhe de atividade e a barra
> de filtros. Os dados por trás dos achados foram confirmados contra a API
> (`GET /activities`), não deduzidos da tela.

Origem: `docs/tasks/feat-melhoria-visual-atividades.md` — a anotação da reunião de
28/07/2026 ("deixar o mais visual possível") não definia resultado verificável. Este
documento é a tradução dela em critérios concretos.

---

## Situação em 2026-07-30 (fim da sessão)

| Achado | Estado |
|---|---|
| 🔴 A1 — Semana esconde o trabalho da semana | ✅ **corrigido e verificado na tela** |
| 🔴 A2 — datas um dia antes, hora fantasma | ✅ **corrigido e verificado na tela** |
| 🟠 A3 — grade mensal lê como Gantt | ⏸️ **em aberto — decisão de produto, ver o fim deste doc** |
| 🟠 A4 — prioridade e tipo sem expressão visual | ✅ prioridade corrigida · tipo (`ActivityTypeBadge`) em aberto |
| 🟡 A5 — hex cru em `lib/activities.ts` | ✅ corrigido (11 hex → tokens) |
| 🟡 A6 — resumo e legenda duplicados | ✅ corrigido (chips viraram legenda + filtro) |
| 🟡 A7 — estado vazio improvisado | ✅ corrigido (`EmptyState`) |
| 🔵 A8 — superfícies fora do token | ✅ corrigido |
| 🔵 A9 — alvos de clique pequenos | ⏸️ em aberto |

Verificação pós-correção, na tela: a semana 27/07–02/08 passou a mostrar **as 6
atividades** que o cabeçalho conta (era 1), distribuídas por dia com "1 vence / 4 em
andamento"; e o detalhe do "Levantamento regulatório ANVISA" passou a exibir
**"26 de jun 2026 — 31 de jul 2026"**, que é exatamente o que a API devolve.

Cobertura nova: `apps/web/lib/activities.test.ts` (18 casos), cobrindo os **dois** tipos
de data — dia de calendário e instante — como o `CLAUDE.md` exige.

---

## Resumo

A tela tem uma base boa — grade mensal com barras multi-dia, filtros completos, resumo
numérico — mas **dois defeitos de correção, não de estética, dominam o diagnóstico**: a
visão Semana esconde a maior parte do trabalho da semana, e todas as datas aparecem um
dia antes do que são. Nenhum trabalho visual compensa isso: a tela está bonita e
errada.

Superado esse par, o problema visual real é que **a grade mensal virou um Gantt**: quase
toda barra atravessa a semana inteira, então a pergunta que um calendário existe para
responder — "o que acontece na terça?" — não tem resposta na tela.

---

## Pontos fortes (preservar)

- **Barras multi-dia com trilhas** (`layoutWeekBars`) — o algoritmo de alocação de
  trilha é correto e o recorte por semana é o comportamento certo. O problema não é ele.
- **Marcador de hoje** — o círculo verde no dia 30 é inequívoco e sobreviveu à
  densidade da grade.
- **Crescimento da linha da semana até 8 trilhas** (`feat-calendario-mostrar-mais-atividades`,
  já fechada) funciona: nenhuma semana escondeu conteúdo atrás de "+N mais" no mês testado.
- **Barra de filtros completa e legível** — projeto, responsável, status, prioridade e
  "Minhas atividades" num só lugar, sem duplicar filtro como na lista de Projetos.
- **Modal de detalhe enxuto**, com "Abrir no projeto" como saída clara.

---

## Achados

### 🔴 Crítico

#### A1 — A visão Semana esconde o trabalho da semana

**Onde:** `activities-client.tsx:75-78` (`groupByDay`) · `lib/activities.ts:22-37`

**Observado na tela:** na semana 27 Jul – 02 Ago, o resumo diz **"6 Total"** e a lista
mostra **uma única atividade** ("Sábado, 01 De Agosto · 1 atividade").

**Causa, confirmada contra a API.** `GET /activities` devolve 6 atividades ativas nessa
semana. Cinco começaram antes dela:

| Atividade | Início | Prazo |
|---|---|---|
| Levantamento regulatório ANVISA | 26/06 | **31/07** |
| Tarefa | 02/07 | **02/08** |
| Protocolo de ensaios de aplicação | 06/07 | **31/07** |
| Decompor | 16/07 | **30/07** |
| Lote piloto #2 — reprodutibilidade | 21/07 | 15/08 |

`groupByDay` agrupa pela **data-âncora** (`startDate ?? dueDate`) e descarta o que cai
fora do intervalo. Como as cinco começaram antes de segunda, somem — apesar de **quatro
delas vencerem justamente nessa semana**. A visão Mês não tem o defeito: `MonthCalendar`
usa `effectiveInterval`, que considera o período inteiro.

**Impacto:** a visão Semana é onde se planeja a semana. Ela está omitindo quatro prazos
que vencem em até cinco dias. E o próprio cabeçalho denuncia a inconsistência — 6 contra 1.

**Princípio violado:** a mesma pergunta responde diferente em duas visões da mesma tela;
o resumo contradiz a lista logo abaixo dele.

**Correção:** `groupByDay` deve usar `effectiveInterval` como o mês, listando a atividade
em todo dia coberto — ou, se a repetição incomodar, separar em dois blocos por dia
("Vence hoje" / "Em andamento"). O resumo e a lista precisam contar a mesma coisa.

---

#### A2 — Todas as datas aparecem um dia antes, com hora inventada

**Onde:** `lib/activities.ts:10-13` (`anchorDate`), `:43-49` (`formatTime`), `:57-66`
(`effectiveInterval`) · `activity-detail.tsx`

**Observado na tela:** o modal de "Tarefa 2" mostra
**"Período: 01 de ago 2026, 21:00 — 20 de ago 2026, 21:00"**. Os dados são
`startDate: 2026-08-02` e `dueDate: 2026-08-21`. As **duas** datas estão um dia atrás, e
o "21:00" não existe em lugar nenhum. O card na lista repete o mesmo 21:00, e o bloco do
dia rotula a atividade como "Sábado, 01 De Agosto".

**Causa:** `Task.startDate`/`dueDate` são **dia de calendário** — o `CLAUDE.md` os lista
nominalmente na tabela da seção "Datas". A API os devolve como meia-noite **UTC**, e
`parseISO` os interpreta em hora local: em `America/Sao_Paulo` (UTC−3), meia-noite UTC do
dia 02 é 21:00 do dia 01. A tela usa `parseISO` direto, sem `parseCalendarDate`.

`formatTime` agrava: ele só omite a hora quando é exatamente `00:00`. Como o deslocamento
produz `21:00`, ele conclui que há horário marcado e o exibe.

**Impacto:** um prazo de dia 02 é lido como dia 01. Num ERP de projeto, é erro de
planejamento — e é o incidente já documentado em `docs/incidentes/timezone-cronograma.md`,
vivo nesta tela.

**Correção:** `parseCalendarDate`/`formatDay` de `lib/dates.ts` em `startDate`/`dueDate`,
e `formatTime` só deve exibir hora para campo que de fato é instante. O `CLAUDE.md`
adverte que um mesmo helper não pode servir aos dois tipos — é o caso aqui.

> ⚠️ Ao corrigir, cobrir os **dois** tipos no teste. Teste que só exercita dia de
> calendário passa com um helper que quebra instantes, e vice-versa.

---

### 🟠 Alto

#### A3 — A grade mensal virou um Gantt e não responde "o que acontece na terça?"

**Onde:** `month-calendar.tsx` · **este é o coração do pedido "mais visual"**

**Observado na tela:** no mês de julho, praticamente toda barra atravessa a semana
inteira, de segunda a domingo. Das ~8 barras por semana, 1 ou 2 têm largura menor que a
linha toda. O resultado é uma pilha de faixas horizontais paralelas — a leitura é de
cronograma, não de calendário.

Some-se a isso a **repetição**: "Levantamento regulatório ANVISA", "Tarefa" e "Protocolo
de ensaios de aplicação" aparecem em **todas as cinco linhas de semana**, porque uma
atividade longa é recortada uma vez por semana. Correto por construção, ilegível na prática.

**Impacto:** a informação que um calendário deveria dar de graça — a carga de um dia
específico — exige clicar no dia. As colunas de dia existem visualmente mas não carregam
informação: a barra que cobre sete colunas não diferencia nenhuma delas.

**Correção (a decidir com você, ver "Top 3"):** distinguir **marco/prazo** de **período**.
Uma atividade de 5 semanas não precisa de uma faixa contínua em cinco linhas; precisa de
um marcador no dia do **prazo** (que é a data acionável) e, no máximo, uma faixa fina de
contexto. O que a equipe olha o calendário para saber é "o que vence quando", não "o que
está aberto".

---

#### A4 — Só o status tem expressão visual; prioridade e tipo não

**Onde:** `month-calendar.tsx:124-145`, `activity-card.tsx:31-35` · `lib/activities.ts:123-139`

**Observado na tela:** a grade inteira é bicolor — verde (`Concluída`) e laranja-pálido
(`Em andamento`). A **prioridade** existe como uma borda esquerda de 2px, que na densidade
real é invisível: não consegui distinguir uma atividade Crítica de uma Baixa sem passar o
mouse. O **tipo** (`ActivityType`) não tem expressão nenhuma, apesar de já existir
`components/ui/activity-type-badge.tsx` pronto no catálogo.

**Impacto:** o eixo que o usuário mais precisa varrer visualmente — o que é urgente — é o
menos visível. Uma tela "mais visual" que codifica só status não resolve o pedido.

**Correção:** promover prioridade a canal visual de verdade (peso da barra, ícone, ou
intensidade), e usar o `ActivityTypeBadge` que já existe. Manter status como cor de
preenchimento.

---

### 🟡 Médio

#### A5 — `lib/activities.ts` reintroduz hex cru na base de código

**Onde:** `lib/activities.ts:123-142`

```
STATUS_META    → #F0F0F0 #575756 #FCEBD2 #C16C06 #DCEFD6 #156D1D
PRIORITY_META  → #878787 #46AD48 #DD8005 #D64550
OVERDUE_COLOR  → #D64550
```

Onze hex crus, consumidos via `style={{}}` inline em `month-calendar.tsx` e
`activity-card.tsx`. O `design-tokens.md` abre com *"Regra nº 1: cor entra SEMPRE por
token semântico. Hex inline é proibido — o ESLint acusa."* O ESLint não acusou porque a
regra mira `className` em JSX, e estes vivem num `.ts` de lib, atravessando por
`style={{}}`.

**Consequência concreta:** `CRITICAL` é `#D64550`, que **não é** o token `destructive`. A
mesma prioridade crítica tem um vermelho aqui e outro no `priority-badge.tsx` — a
unificação registrada como resolvida em `docs/analise-uiux.md` (#1) nunca alcançou este
arquivo.

**Correção:** mover para tokens (`hsl(var(--...))`) e reusar `PriorityBadge`/`StatusBadge`
em vez do mapa local.

#### A6 — Resumo e legenda dizem a mesma coisa em duas linguagens

**Onde:** `activities-client.tsx:148-168`

Cinco chips numéricos (Total, A fazer, Em andamento, Concluídas, Atrasadas) e, ao lado,
uma legenda de quatro quadradinhos coloridos com os mesmos rótulos. Duas gramáticas
visuais para o mesmo conceito, ocupando uma faixa inteira acima do calendário.

**Correção:** dar cor aos próprios chips e eliminar a legenda — o chip vira legenda e
filtro ao mesmo tempo. Bônus: clicar no chip filtra, o que hoje exige o select.

#### A7 — Estado vazio improvisado, com `empty-state.tsx` disponível

**Onde:** `activities-client.tsx:181-183`

Caixa tracejada com uma frase ("Nenhuma atividade no período selecionado."), sem ícone e
sem saída. O catálogo tem `components/ui/empty-state.tsx` (ícone + título + descrição +
CTA), usado em POPs e agora em Estoque.

**Correção:** trocar pelo componente, com CTA "Nova tarefa" ou "Limpar filtros" conforme
o motivo do vazio.

### 🔵 Baixo

#### A8 — Superfícies fora do token

`activity-card.tsx:27-29` usa `bg-white`/`border-gray-200`; `activities-client.tsx` usa
`bg-white`, `bg-gray-50`, `border-gray-100`. O equivalente semântico é
`bg-card`/`border-border`/`bg-muted`. Sem impacto visual hoje (os valores coincidem), mas
quebra na primeira mudança de tema.

#### A9 — Alvos de clique pequenos na grade

As barras têm 20px de altura (`LANE_HEIGHT`) com 3px de intervalo. Funciona no mouse;
fica apertado em telas menores e para quem tem menos precisão motora.

---

## Inconsistências cross-tela

1. **Prioridade tem duas escalas de cor** — `PRIORITY_META` (hex, aqui) × `PriorityBadge`
   (tokens, resto do app). A mesma Task pode aparecer com vermelhos diferentes em
   Atividades e no Kanban. É a regressão do achado #1 de `docs/analise-uiux.md`, que
   nunca cobriu este arquivo.
2. **Estado vazio tem dois padrões** — `EmptyState` (POPs, Estoque, Anotações) × caixa
   tracejada ad-hoc (Atividades).
3. **Dia de calendário tem dois tratamentos** — `parseCalendarDate` (TAP, Gantt, projetos)
   × `parseISO` direto (Atividades). O `CLAUDE.md` documenta a regra; esta tela é a
   exceção que sobrou.

---

## Top 3 ações (impacto ÷ esforço)

| # | Ação | Por quê | Esforço |
|---|---|---|---|
| 1 | **Corrigir o fuso (A2)** | Datas erradas por um dia num ERP de projeto. Regra já documentada, helper já existe (`lib/dates.ts`), correção localizada em 3 funções. | Baixo |
| 2 | **Semana usar `effectiveInterval` (A1)** | Devolve quatro prazos que hoje somem da visão onde se planeja a semana, e elimina a contradição 6 × 1 no cabeçalho. Uma função. | Baixo |
| 3 | **Prioridade visível + tokens (A4 + A5)** | É o que a reunião pediu com "mais visual", e limpa o hex cru no mesmo movimento. | Médio |

> A4 e A5 são a mesma edição: ao trocar os mapas locais pelos componentes de badge, a
> prioridade ganha peso visual e o hex sai junto.

**A3 fica de fora do Top 3 de propósito.** Ele é o achado visual mais profundo, mas a
correção muda o *modelo mental* da tela (período contínuo × marcador de prazo) — é decisão
de produto sua, não de execução. Vale conversar antes de mexer.
