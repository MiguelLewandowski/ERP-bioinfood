# Rodada de melhorias de UI — módulo de Projetos

Plano de sete ondas, cada uma **entregável e deployável sozinha**, saído de uma
revisão de interface de 2026-07-27 com ~25 itens em cinco telas: Dashboard do
projeto, Gantt, Metodologia, EAP/WBS e Termo de Abertura.

Ordenadas por **impacto ÷ esforço**, não por tela.

---

## Próximos passos

```
/implementar-plano docs/tasks/bug-gantt-marco-grava-sem-comparar.md
```

Estado em 2026-07-29: **as sete ondas estão implementadas** e integradas em
`develop`, aguardando promoção para `main`.

| Onda | Estado |
|---|---|
| 1 — EAP/WBS | ✅ entregue e em produção |
| 2 — TAP | ✅ implementada |
| 3 — Metodologia | ✅ implementada |
| 4 — Dashboard | ✅ implementada |
| 5 — `requiresSOP` | ✅ implementada — **tem migration** |
| 6 — Gantt | ✅ implementada |
| 7 — Transversal | ✅ implementada |

> **A promoção não é um lote.** A Onda 5 leva migration aditiva que
> `prisma:deploy` aplica sozinha no boot da API. Ver "Ordem de promoção" no fim
> deste documento.

---

## Onda 1 — EAP/WBS ✅ ENTREGUE

Rollup de progresso por pacote (% + `7/12 tarefas`), tooltip que cobria o campo
DONO, badges "pronto"/"saídas" viraram **alerta por exceção** (só aparecem quando
faltam), hierarquia visual entre níveis, "+ sub" sempre visível.

Entregue em `feat/ui-projetos-onda-1-eap`, publicado em `main` (`f271987`).

**Duas decisões que ficaram no código**, para quem for mexer depois:

- Critério de pronto e saídas só se cobram da **folha**. Nó que só agrupa filhos
  não gera alerta — cobrar documentação de execução de um agrupador recria o
  ruído que a mudança eliminou. "Sem dono" vale em todos os níveis.
- Pacote sem tarefa diz **"sem tarefas"**, não "0%". São coisas diferentes: 0% lê
  como "nada foi feito"; a realidade é "nada foi planejado aqui ainda".

**Descoberta que vale para a Onda 6:** `lib/project-wbs.ts` expõe `buildWbsIndex`
com `rootOf` (nodeId → pacote de nível 1) **separado** do rollup, justamente para
o agrupamento por pacote no Gantt reaproveitar a navegação da árvore.

---

## Onda 2 — TAP ✅ IMPLEMENTADA

**Um arquivo só:** `apps/web/app/(dashboard)/projects/[id]/charter/_components/charter-client.tsx`

| Item | O que foi feito |
|---|---|
| Botão "Salvar" desabilitado parece bug | Botão removido. No lugar, indicador `aria-live` com três estados: "Alterações não salvas" → "Salvando…" → "Salvo às 14:32" |
| Três elementos competindo no header | Pill de aprovado virou `<Badge variant="success">`; com o Salvar fora, sobraram dois elementos e uma hierarquia |
| Bolinhas de status sem semântica | Dois estados: `bg-success` (preenchida) e `bg-border` (vazia), com `aria-label` correspondente |
| Tipo/Prioridade soltos ocupando a largura inteira | `half?: boolean` no `FieldDef` + grid de 2 colunas; campo sem o flag atravessa as duas |
| ~~Falta limite de leitura~~ | ⚠️ **não existia.** O `max-w-3xl` já estava no container do formulário |

**Duas coisas que a revisão diagnosticou errado**, para quem for auditar depois:

- O status "Aprovado" **já era um `<span>`**, nunca foi botão. O que competia era o
  peso visual — pill do mesmo tamanho dos botões vizinhos, com `style` inline em vez
  do primitivo `Badge`.
- O `max-w-3xl` já existia. Nada foi mudado por esse item.

**Decisão que ficou no código:** remover o botão Salvar abre um caminho de perda de
texto — o autosave depende do `blur`, e fechar a aba com o cursor dentro do campo
nunca dispara blur. O `beforeunload` guardado por `isDirty` é a **contrapartida da
remoção**, não um extra. Não remover um sem o outro.

> Cuidado ao mexer nas datas deste arquivo: ele tem `fmtDay` e `fmtInstant`
> **separados de propósito** (incidente de fuso, §3). `approvedAt` é instante;
> `project.startDate`/`endDate` são dia de calendário. Não reunifique. O `fmtClock`
> do indicador de autosave é instante também.

---

## Onda 3 — Metodologia ✅ IMPLEMENTADA

**Um arquivo:** `apps/web/app/(dashboard)/projects/[id]/metodologia/_components/methodology-client.tsx`
(~203 linhas). **Não tocar** em `lib/project-pops.ts`.

| Item | Detalhe |
|---|---|
| Barras de progresso das POPs quase invisíveis | Hoje `w-28`; dar largura útil e contraste |
| Lista "44 tarefas sem POP" ilegível | Colapsar por padrão, com busca e agrupamento por responsável |
| Card "divergência de versão" | Quando `> 0`: vermelho **e primeira posição** do grid |

O denominador errado da métrica de cobertura **não entra aqui** — é a Onda 5, que
precisa de campo no banco. Separar UI de schema mantém cada uma deployável.

**Complexidade: baixa/média.**

---

## Onda 4 — Dashboard do projeto ✅ IMPLEMENTADA

| Item | Arquivo |
|---|---|
| Trocar 3 barras por **barra empilhada** + cores semânticas por estado | `dashboard/_components/tasks-card.tsx` |
| "Tarefa sem responsável" clicável → backlog filtrado | `tasks-card.tsx` |
| "Carga por responsável" vira card próprio, ordenado por **menor progresso** | novo `dashboard/_components/assignee-load-card.tsx` |
| Link "Abrir Gantt" | `dashboard/_components/overview-card.tsx` |

> **A ordenação por menor progresso vai no componente, não em
> `lib/project-metrics.ts`.** O card recebe o array e ordena localmente — três
> linhas, e evita mexer num arquivo compartilhado por várias telas.

> ⚠️ **O item "barras de tarefas não proporcionais" NÃO existe.** Foi verificado:
> `tasks-card.tsx:45` calcula `(count / metrics.total) * 100` e o `ProgressBar` não
> tem largura mínima. A conta bate (15/46 = 33%, 4/46 = 9%, 27/46 = 59%). Era
> percepção causada por três trilhos de mesma largura com valores próximos — e a
> barra empilhada resolve isso sozinha. **Não "corrija" nada por esse motivo.**

O item "dar peso visual ao desvio de cronograma" foi movido para a Onda 7.

**Complexidade: média.**

---

## Onda 5 — `requiresSOP` ✅ IMPLEMENTADA — ÚNICA COM BANCO

Corrige o denominador da métrica de cobertura de POPs, que hoje conta tarefas
administrativas que nunca vão precisar de procedimento.

**Cadeia, em série:** migration → DTO em `packages/shared` → `update` no módulo
`tasks` → checkbox no `TaskFormDialog` → filtro em `computeMethodology`.

`Task.requiresSOP Boolean @default(true)` — o default `true` preserva o
denominador atual, então **o número não muda sozinho no deploy**. Quem marcar uma
tarefa como administrativa reduz o denominador conscientemente.

**Duas adições decididas junto**, para o checkbox não virar campo que ninguém
marca:

1. **Default inteligente na criação.** Tarefa em pacote técnico da EAP
   (Matéria-Prima, Bancada, Piloto) nasce `true`; tarefa em "Gestão do Projeto"
   nasce `false`. Aproveita o `wbsNodeId` que a tarefa já carrega.
2. **Ação em massa na tela de Metodologia.** Checkbox por linha na lista "tarefas
   sem POP" para marcar como não aplicável. A classificação acontece **onde a
   métrica dói**, não escondida no formulário.

**Complexidade: média-alta** — pelo número de camadas, não pela lógica.

> Migration aditiva com default: não é destrutiva, mas vale a leitura da §3 do
> [`deploy.md`](./deploy.md) antes. `prisma:deploy` aplica sozinha no boot.

---

## Onda 6 — Gantt ✅ IMPLEMENTADA

Era bloqueada pelo incidente de fuso
([`docs/incidentes/timezone-cronograma.md`](./incidentes/timezone-cronograma.md)),
que fechou em 2026-07-28. **Ler o incidente antes de mexer** — ele explica por que
o Gantt lê e escreve como escreve.

| Item | Observação |
|---|---|
| Zoom padrão em mês + controle Dia/Semana/Mês/Trimestre | |
| Linha vertical de hoje com auto-scroll + botão "Hoje" | Já existe marcador "Hoje" em `buildMarkers` |
| Nome da tarefa como primeira coluna **sticky** | |
| Coluna "Dura…" truncada | Largura da coluna `duration` |
| Label fora da barra quando ela é estreita | |
| Barras com % de progresso e comparação visual com baseline | `baselines` já ligado no componente |
| Cor por status | Já existe em `gantt-status.css` — revisar contraste |
| Destaque de caminho crítico com toggle | ⚠️ **já é calculado** — `criticalPath={{ type: 'flexible' }}` está ativo. O trabalho é expor toggle e dar cor, não calcular |
| Ordenação/agrupamento inconsistente das linhas | ⚠️ **não é bug de ordenação** — ver abaixo |

**Sobre o "agrupamento inconsistente":** a ordenação é por `wbsNodeId` e está
correta. Linhas 1-8 são "1. Gestão do Projeto" (tarefas espalhadas por 2 anos por
causa de Monitoramento e Controle); linhas 9+ são "2. Matéria-Prima", voltando
para jul/25. **O que falta é cabeçalho de grupo por pacote da EAP**, não
reordenar. Use `buildWbsIndex().rootOf` de `lib/project-wbs.ts` — foi projetado
para isso na Onda 1.

**Já feito, não refazer:** a remoção do `<Toolbar>` duplicado da SVAR migrou para
o incidente de fuso e **já está em produção** — era caminho de escrita não
controlado, não questão estética.

**Complexidade: alta.** É a onda de maior valor percebido e a de maior esforço.

---

## Onda 7 — Transversal ✅ IMPLEMENTADA

- Skeletons de loading nos `loading.tsx`
- Tooltip no breadcrumb truncado
- Densidade consistente entre as telas
- Responsividade em **1366px** — inclui conferir a EAP, onde o bloco de rollup da
  Onda 1 adicionou ~150px por linha
- **Peso visual do desvio de cronograma** (`dashboard/_components/schedule-card.tsx`),
  herdado da Onda 4

Por último de propósito: mexe em todas as telas e conflitaria com qualquer onda
em voo.

---

## Riscos gerais

- **Produção sem homologação.** Cada onda merece deploy próprio e um smoke de 5
  minutos, não um lote. Ver [`deploy.md`](./deploy.md).
- **A SVAR está fixada em 2.7.1** (`apps/web/package.json`). Não soltar o range
  durante a Onda 6 — a customização de escalas e colunas depende de detalhes
  internos da lib. E lockfile viaja junto com `package.json`.
- **`requiresSOP` com default `true` não altera métrica nenhuma no dia do
  deploy.** O valor só aparece quando alguém classificar as tarefas — combinar com
  o time antes, senão a onda entrega um checkbox morto.

## Fora do escopo desta rodada

Itens que apareceram na revisão mas viraram tarefa própria em
[`docs/tasks/`](./tasks/README.md), com investigação feita:

- `bug-gantt-marco-grava-sem-comparar.md`
- `perf-gantt-reordenar-reescreve-projeto-inteiro.md`
- `test-suite-web-instavel-sob-carga.md`

---

## Ordem de promoção para `main`

`develop` acumula as ondas 2 a 7. A promoção segue o runbook de
[`deploy.md`](./deploy.md), com um cuidado que não existia nas ondas anteriores:

1. **A Onda 5 tem migration.** `20260728180000_add_requires_sop` é **aditiva com
   default** (`Task.requiresSOP BOOLEAN NOT NULL DEFAULT true`), então não exige
   as duas publicações do procedimento destrutivo. Ela aplica sozinha no
   `startCommand` da API.
2. **A métrica não se mexe no dia do deploy.** Com o default `true`, toda tarefa
   existente continua no denominador. A cobertura de POPs só muda quando alguém
   usar a ação em massa da tela de Metodologia. Se o time não for classificar,
   a Onda 5 não entrega valor — combine antes.
3. **Smoke de 5 minutos, por onda**, não um só no fim.

## O que a implementação corrigiu no próprio plano

Quatro itens desta rodada não eram o que a revisão de 2026-07-27 descreveu.
Registrado para quem for auditar:

- **Onda 2** — o `max-w-3xl` já existia e o status "Aprovado" já era `<span>`.
  O problema real era peso visual, não semântica de elemento.
- **Onda 3** — o card de divergência de versão **já era vermelho**
  (`tone="destructive"`) e já tinha um banner de alerta abaixo. Item cortado.
- **Onda 4** — "tarefa sem responsável clicável" não morava em `tasks-card.tsx`:
  o backlog **não tinha filtro por responsável**. Foi preciso criar
  `?assignee=none` antes de existir para onde linkar.
- **Onda 7** — os skeletons **já existiam nas 11 abas**. O trabalho foi dar forma
  a 8 que eram um bloco `h-96` cru, agora centralizados em
  `_components/page-skeletons.tsx` (que é também o que mantém a densidade
  consistente entre as telas).

## Decisões travadas no código

- **Onda 2 — `beforeunload` é contrapartida da remoção do botão Salvar**, não um
  extra. O autosave depende do `blur`; fechar a aba com o cursor no campo nunca
  dispara blur. Não remover um sem o outro.
- **Onda 5 — o "default inteligente por pacote da EAP" foi cortado.** A regra
  dependia de comparar o **nome** do pacote raiz contra uma lista, e nome de
  pacote é texto livre editável: renomear "Gestão do Projeto" quebraria a
  heurística em silêncio. A classificação acontece na ação em massa, onde a
  métrica dói.
- **Onda 6 — a guarda de escrita do Gantt não é por prefixo de id.** Era
  `isMilestoneId` (`ms-`); virou `isRealTask`, que pergunta se a linha
  corresponde a uma tarefa existente. Motivo: com o `groupBy` nativo da SVAR, o
  cabeçalho de pacote é uma linha com id **gerado pela lib**, que não segue
  convenção nossa — e sem guarda o `persistOrder` mandava esse id para
  `/tasks/reorder` e o `currentParentId` o gravava como `parentId`. Mesma classe
  do `<Toolbar>` removido no incidente de fuso: caminho de escrita não
  controlado. Coberto por `use-gantt-persistence.test.tsx`.
- **Onda 6 — o zoom usa API pública.** `IZoomConfig` é tipo exportado da
  `@svar-ui/gantt-store` 2.7.1, então a versão continua fixada sem virar dívida.
