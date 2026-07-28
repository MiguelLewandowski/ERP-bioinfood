# Incidente — deslocamento de fuso nas datas de cronograma

| | |
|---|---|
| **Estado** | **Correção completa.** Etapa (a) feita e coberta por teste; etapa (b) inexistente (não há dado a corrigir); etapa (c) cancelada. **Falta só teste manual e deploy** |
| **Aberto em** | 2026-07-27 |
| **Branch** | `fix/timezone-cronograma` (a partir de `develop`) |
| **Impacto** | Datas exibem o dia errado. **Os dados gravados estão corretos** — ver seção 9 |
| **Ambiente** | Produção (Railway), ~10 usuários ativos, todos em UTC-3 |

> **Sobre a procedência deste documento.** O diagnóstico original foi feito numa
> sessão que se perdeu. Tudo aqui foi **reverificado contra o código** em
> 2026-07-27, com uma exceção marcada explicitamente na seção 3. Onde este
> documento diverge da memória de alguém, o código é a fonte.

> **Revisão de 2026-07-27, após as queries de produção (seção 9).** O diagnóstico
> mudou de forma: **não há dado corrompido no banco**. O bug é inteiramente de
> renderização, e o risco real está num caminho de escrita que ninguém tinha
> mapeado. A prioridade da etapa (a) foi reordenada por causa disso.

---

## 1. Sintoma

Datas de dia (prazo de tarefa, data de marco, início/término de projeto) aparecem
um dia antes do gravado. Confirmado pelas queries: **o dado no banco está certo, a
tela é que mente.**

Além disso, apareceu no Gantt uma tarefa "New Task" que ninguém criou pelo
formulário, com prazo em 2027 — ver seção 2.4.

---

## 2. Causa raiz

São **quatro** caminhos de escrita, não dois. O inventário original tinha os dois
primeiros; as queries revelaram o quarto.

| # | Caminho | Grava | Estado |
|---|---|---|---|
| 1 | Seed (`new Date('2025-07-01')`) | `00:00:00Z` | **correto** |
| 2 | `TaskFormDialog` → `combineDateTime` | hora local → UTC (`03:00Z` se sem hora) | ~~bug latente~~ **corrigido** (§2.1) |
| 2b | `TaskFormDialog` → `toTimeInput` (round-trip de edição) | empurrava +1 dia a cada abrir-e-salvar | ~~bug ativo~~ **corrigido** (§2.6) |
| 3 | API direta (`new Date('YYYY-MM-DD')`) | `00:00:00Z` | correto |
| 4 | **SVAR → `use-gantt-persistence`** | ISO de `Date` local, com `+1 dia` embutido | ~~bug ativo~~ **corrigido** (§2.4) |

Os quatro caminhos gravam agora `YYYY-MM-DD`, que a API persiste como `00:00Z` —
o mesmo formato que o banco já tinha. Nenhum converte mais para UTC.

O erro de leitura (§2.2) é ortogonal e atinge todos eles.

### 2.1 Escrita — `combineDateTime` (latente)

`apps/web/app/(dashboard)/projects/[id]/_components/tasks/task-form-dialog.tsx:62`

```ts
function combineDateTime(date: string, time: string | undefined): string {
  return new Date(`${date}T${time || '00:00'}:00`).toISOString();
}
```

`new Date('2026-10-01T00:00:00')` — sem `Z` — é interpretado como meia-noite
**local**. `.toISOString()` converte para UTC e produz `2026-10-01T03:00:00.000Z`.
O banco receberia 03:00Z para o que o usuário digitou como "1º de outubro".

**Por que "latente": não existe um único registro `03:00:00` em produção.** O
formulário mal foi usado para datas de cronograma — a única tarefa criada por ele
tinha hora real (15:20 BRT → `18:20:00Z`, que é a gravação correta de um instante).
O bug é real e continua armado; só não produziu massa ainda. Corrigir segue sendo
necessário — como **prevenção**, não como contenção.

### 2.2 Leitura — `fmtCol` e os renderizadores

`apps/web/app/(dashboard)/projects/[id]/gantt/_components/gantt-mapping.ts:42`

```ts
const fmtCol = (d?: Date | string) => {
  const date = new Date(d);
  ...date.toLocaleDateString('pt-BR', ...)
};
```

`new Date('2026-10-01T00:00:00.000Z')` é meia-noite UTC; renderizado em
`America/Sao_Paulo` vira **30/09 às 21h**. O dia exibido recua um.

A correção já existe no repositório e não é usada nesses pontos —
`parseCalendarDate` em `apps/web/lib/dates.ts`:

```ts
export function parseCalendarDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}
```

### 2.3 Por que ninguém percebeu antes

| Origem | Gravado | Lido com `new Date()` em UTC-3 | Resultado |
|---|---|---|---|
| Seed / API direta | `00:00:00Z` | 30/06 21:00 | **dia errado** |
| Formulário com hora real | `18:20:00Z` | 15:20 do dia certo | dia certo |

Praticamente todo o cronograma é `00:00:00Z`, então **quase tudo exibe o dia
anterior** — o que salvou a percepção foi ninguém conferir data contra o banco.

> **Hipótese descartada.** O diagnóstico original supunha que escrita e leitura se
> cancelavam para os registros do formulário, e concluía daí que `combineDateTime`
> e `fmtCol` tinham que ir no mesmo deploy. **Isso caiu:** sem nenhum registro em
> `03:00Z`, não há massa para quebrar. Os dois commits são independentes. A ordem
> abaixo é por risco, não por dependência técnica.

### 2.4 Escrita descontrolada — a SVAR (o problema de verdade)

Duas coisas separadas, ambas em `use-gantt-persistence.ts`.

**(a) Round-trip com `+1 dia` embutido.** `gantt-mapping.ts:94` normaliza a barra
para exibição:

```ts
end: end <= start ? addDays(start, 1) : end,
```

É legítimo como *display* — barra de duração zero não teria largura. O problema é
que esse valor normalizado entra na store da SVAR, e o handler `update-task`
(`use-gantt-persistence.ts:103-104`) **grava de volta o que está na store**:

```ts
if (t.start) data.startDate = new Date(t.start).toISOString();
if (t.end)   data.dueDate   = new Date(t.end).toISOString();
```

Qualquer interação que dispare `update-task` numa tarefa de duração zero persiste
o `+1 dia` que existia só para desenhar. **Normalização de exibição virando dado.**
Esse é o "+1 dia" relatado no sintoma original.

Agrava: `new Date(t.start)` recebe um `Date` local da SVAR e `.toISOString()` o
converte para UTC — o mesmo erro do `combineDateTime`, agora no caminho que
efetivamente é usado.

**(b) Botão azul duplicado = criação sem formulário.** `gantt-client.tsx:233`
renderiza `<Toolbar api={api} />` da SVAR além do botão "Nova Tarefa" próprio
(linha 108). O da SVAR dispara `add-task`
(`use-gantt-persistence.ts:110-128`), que cria a tarefa direto na API com título
padrão "New Task" e datas vindas da escala visível.

Confirmado em produção: existe uma tarefa "New Task" com `dueDate` em **2027**,
criada às 16:45, que ninguém digitou. Não é questão estética — é **caminho de
escrita não controlado**, e por isso a remoção do `<Toolbar>` migrou da rodada de
UI (onda 6) para dentro deste incidente.

### 2.5 Reescrita em massa — o que de fato aconteceu

Os 46 registros do seed têm `updatedAt` idêntico ao milissegundo
(`2026-07-27 17:20:24.149`), sete segundos após uma interação no Gantt. É escrita
em massa, não edição humana.

Mecanismo: `persistOrder` (`use-gantt-persistence.ts:148-159`) está ligado a
`move-task` **e** a `indent-task`. Um único arrastar resequencia o projeto inteiro
— por desenho, documentado no comentário do próprio arquivo, porque `order` é
global por projeto.

**Precisão importante:** `tasksApi.reorder` (`api-hooks.ts:56`) envia apenas
`{ id, order }`. **As datas nunca estiveram em risco por esse caminho.** O que a
reescrita em massa fez foi carimbar `updatedAt` em 46 linhas — nenhum dado de
cronograma foi alterado. É "a torneira está aberta" no sentido de que o volume de
escrita é desproporcional à ação do usuário, não no sentido de corrupção.

### 2.6 Round-trip do formulário — abrir e salvar empurrava a tarefa um dia

Encontrado em 2026-07-28, ao restaurar o horário da tarefa. **Quinto defeito, e o
único que corrompia dado de forma silenciosa e repetida.**

`toTimeInput` decidia se havia hora comparando o horário **LOCAL** com `'00:00'`:

```ts
const time = new Date(d).toTimeString().slice(0, 5);
return time === '00:00' ? '' : time;
```

Registro dia-puro é `00:00Z`, que em `America/Sao_Paulo` é **21:00 do dia
anterior**. Então o formulário de edição abria com "Hora de Início: 21:00" numa
tarefa que não tinha hora — e ao salvar, `21:00` local virava `00:00Z do dia
seguinte`.

Verificado em node com `TZ=America/Sao_Paulo`:

```
registro dia-puro 2026-08-10T00:00:00.000Z
  toTimeInput devolveria: 21:00
  salvar sem mexer grava: 2026-08-11T00:00:00.000Z
```

**Cada abrir-e-salvar empurrava a tarefa um dia para frente**, cumulativamente, em
todos os 46 registros de produção — que são todos `00:00Z`. Ninguém precisava
tocar na data.

Corrigido em `ef1c7c6`: a detecção passou a ser `hasTimeComponent`, que checa
componentes UTC. Três testes travam o comportamento, incluindo o round-trip
completo (abrir → salvar → conferir que a data não mexeu).

> Este defeito **não aparecia nas queries**: ele exigia alguém abrir e salvar uma
> tarefa pelo formulário, o que quase não acontecia. Estava armado, não disparado.

### 🔴 `updatedAt` NÃO é critério de origem neste projeto

**Leia isto antes de escrever qualquer query de diagnóstico sobre `Task`.**

`persistOrder` carimba `updatedAt` em **todas** as tarefas do projeto a cada
arrastar no Gantt. Logo:

- `updatedAt > createdAt` **não** significa "alguém editou esta tarefa";
- `updatedAt` idêntico em N linhas **não** significa corrupção em massa — pode ser
  um único arrastar;
- ordenar por `updatedAt` para achar "o que mudou por último" devolve o projeto
  inteiro.

Isto invalidou o filtro de uma das queries deste próprio incidente: a Q2
classificava origem por `updatedAt > createdAt + 1min` e teria rotulado 46 linhas
do seed como "editadas depois". A classificação por **hora gravada** (§9) é a que
se sustenta.

Enquanto `persistOrder` resequenciar o projeto inteiro (item 2 da seção 10), o
único critério confiável de origem é o conteúdo do dado, não seu carimbo de
tempo.

---

## 3. Inventário de renderizadores

Levantado por `grep -rl toLocaleDateString apps/web` em 2026-07-27. **O inventário
original de "8 renderizadores contaminados" tem uma correção e duas ressalvas.**

### Contaminados — campo de dia lido com `new Date()`

| Arquivo | Linha | Campo | Commit |
|---|---|---|---|
| `projects/[id]/gantt/_components/gantt-mapping.ts` | 42 (`fmtCol`) | `start`, `end` | **1** (junto com `combineDateTime`) |
| `projects/[id]/backlog/_components/backlog-row.tsx` | 40 | `task.dueDate` | 2 |
| `projects/[id]/kanban/_components/kanban-card.tsx` | 91 | `task.dueDate` | 2 |
| `components/projects/project-card.tsx` | 12 | `startDate`, `endDate` | 2 |
| `components/projects/projects-table.tsx` | 14 | `startDate`, `endDate` | 2 |
| `app/(dashboard)/dashboard/page.tsx` | 23 | `dueDate` (dashboard **global**) | 2 |
| `lib/project-report.ts` | 11 | `startDate`, `endDate`, `forecastEndDate` | 2 |
| `projects/[id]/charter/_components/charter-client.tsx` | 30 (`fmtDate`) | `startDate`, `endDate` | **3** (split, ver abaixo) |

### A aritmética

`gantt-mapping.ts` nunca fez parte da lista dos "8 renderizadores" — sempre foi
tratado à parte, no commit 1, porque é interdependente com `combineDateTime`.
Partindo da lista original:

| | |
|---|---|
| Inventário original | **8** renderizadores |
| − `pop-row.tsx`, falso positivo verificado | **7** contaminados de verdade |
| − `charter-client.tsx`, que vai sozinho no commit 3 | **commit 2 leva 6** |

Ou seja: **7 renderizadores contaminados** (+ `fmtCol`, no commit 1), em **3
commits**. Quem for conferir o commit 2 vai contar 6 arquivos, e isso está certo.

### 🚫 `pop-row.tsx` — falso positivo VERIFICADO, não corrigir

**Se você chegou aqui numa próxima passada achando que faltou corrigir o
`pop-row.tsx`: não faltou. Ele está certo. Não mexa.**

`app/(dashboard)/pops/_components/pop-row.tsx:13` formata
`pop.latestVersion.createdAt` (usado nas linhas 125 e 174) — um **instante**, não
um dia de calendário. Renderizar instante em hora local é o comportamento
correto. Aplicar `parseCalendarDate` aqui **introduziria** um bug: uma versão
criada às 22h de Brasília (`01:00Z` do dia seguinte) passaria a exibir o dia
seguinte.

Verificado em 2026-07-27 lendo os três pontos de uso. A regra geral que este
achado gerou está em `CLAUDE.md`, seção "Datas — dia de calendário vs instante".

### ⚠️ `charter-client.tsx` tem helper misto — exige split, não troca

`projects/[id]/charter/_components/charter-client.tsx:30` — o mesmo `fmtDate`
serve dois tipos:

| Linha | Campo | Tipo |
|---|---|---|
| 421 | `approvedAt` | **instante** — manter `new Date()` |
| 477 | `project.startDate` | dia — precisa de `parseCalendarDate` |
| 481 | `project.endDate` | dia — precisa de `parseCalendarDate` |

Trocar a implementação do helper conserta 477/481 e **quebra** 421. Tem que virar
duas funções.

### Corretos — não tocar

| Arquivo | Por quê |
|---|---|
| `lib/crm-tasks.ts` (73, 89, 152) | Já faz `slice(0,10)}T00:00:00` à mão. Correto, mas duplica `parseCalendarDate` — vale unificar **depois**, fora deste incidente. |
| `lib/charter-report.ts:41` | `new Date()` — agora, instante. |
| `lib/project-report.ts:71` | `new Date()` — agora, instante. |
| `gantt-client.tsx:94` | `baselineSetAt` — instante. |

---

## 4. Mapa de conflito de arquivos

Este incidente e a rodada de melhorias de UI do módulo de Projetos correm em
paralelo. **Território exclusivo deste incidente:**

```
lib/dates.ts
lib/project-metrics.ts
projects/[id]/gantt/_components/gantt-mapping.ts
projects/[id]/gantt/_components/use-gantt-persistence.ts
projects/[id]/gantt/_components/gantt-client.tsx
projects/[id]/_components/tasks/task-form-dialog.tsx
projects/[id]/roadmap/_components/roadmap-client.tsx
projects/[id]/dashboard/page.tsx
projects/[id]/dashboard/_components/schedule-card.tsx
projects/[id]/dashboard/_components/milestones-card.tsx
```

**Território da Onda 1 de UI (PR aberto para `develop`) — não tocar aqui:**

```
lib/project-wbs.ts
projects/[id]/wbs/_components/wbs-client.tsx
projects/[id]/wbs/page.tsx
```

Consequência de calendário: a onda do Gantt (onda 6 da rodada de UI) está
**bloqueada** até este incidente fechar — os três arquivos do Gantt são os mesmos.

---

## 5. Plano de correção

Reordenado em 2026-07-27 após as queries. **Critério: fechar caminho de escrita
descontrolada primeiro, corrigir exibição depois.** Antes, a ordem partia do
pressuposto de que havia dado corrompido — não há.

### Etapa (a) — front puro · 1 deploy

**Bloco 1 — fechar a torneira (o crítico).**

1. **Remover o `<Toolbar>` da SVAR** (`gantt-client.tsx:233`). Elimina a criação
   de tarefa sem formulário. O botão "Nova Tarefa" da linha 108 já cobre a função,
   e passa pelo `TaskFormDialog` com validação. **Menor mudança, maior redução de
   risco de todo o incidente.**
2. **PATCH condicional no `update-task`** (`use-gantt-persistence.ts:87-108`) —
   commit isolado, revertível sozinho. Só enviar campo que **de fato mudou**, em
   vez de reenviar o que está na store. Fecha o round-trip de §2.4(a).
3. **Separar normalização de exibição da de persistência** — o `addDays(start,1)`
   de `gantt-mapping.ts:94` não pode chegar ao que se grava. Ou a normalização sai
   do objeto persistido, ou a duração zero passa a ser resolvida no render.

**Bloco 2 — corrigir a exibição.** Independentes entre si (ver §2.3); podem ir
em qualquer ordem, e cada um é revertível sozinho.

4. **`fmtCol` com `parseCalendarDate`** (`gantt-mapping.ts:42`).
5. **Os 6 renderizadores de troca simples** — `backlog-row`, `kanban-card`,
   `project-card`, `projects-table`, `dashboard/page` (global) e
   `lib/project-report`. **Sem** tocar `pop-row` (falso positivo verificado) e
   **sem** o `charter-client`.
6. **Split do `charter-client` em `fmtInstant` / `fmtDay`** — commit próprio. É o
   único ponto que muda **assinatura de função** em vez de trocar implementação,
   e misturá-lo com o commit 5 esconderia essa diferença no diff.

> **Bloco 2 fechado em 2026-07-27.** Os três itens estão implementados
> (`9e802dc`, `16bd373`, `b4071ec`). O `new Date()` restante em
> `lib/project-report.ts:72` é a data de geração do relatório — instante, correto.
>
> O item 6 era o único sem teste, justamente sendo o de maior risco. Coberto em
> `charter-client.test.tsx` com os **dois** tipos no mesmo describe: dia de
> calendário (`startDate` em `00:00Z` → 01/10, não 30/09) e instante (aprovação
> às 22h de Brasília, `01:00Z` do dia seguinte → 01/10, não 02/10). Verificado
> que o caso de instante falha contra o helper único de antes do split.
>
> O fuso passou a ser fixado em `vitest.config.ts` (`TZ=America/Sao_Paulo`):
> teste de instante depende do relógio local e, sem isso, mudaria de resultado
> entre a máquina do dev (UTC-3) e o CI/Railway (UTC).

**Bloco 3 — fechar a origem latente.**

7. **`combineDateTime` emitindo `YYYY-MM-DD`** — prevenção, não contenção (§2.1).
8. **Remoção dos campos de hora do `TaskFormDialog`** — decisão de produto na
   seção 7. Com dia puro, o `combineDateTime` some junto.

> A ordem antiga colocava o `use-gantt-persistence` em 4º "por precaução". Ele é o
> **1º-3º** porque é o único caminho que ainda escreve dado errado hoje.

### Etapa (b) — **VAZIA. Não existe.**

As queries não encontraram dado deslocado: tudo em `00:00:00Z`, que é a gravação
correta de um dia de calendário.

As duas únicas linhas fora desse padrão eram lixo de teste — a tarefa "New Task"
criada pela Toolbar da SVAR e a tarefa "teste" em `18:20/18:23` — e foram
**excluídas pela UI em 2026-07-27**.

**Resultado: zero registros a corrigir. Sem script, sem `UPDATE`, sem execução
manual contra o banco de produção.** A etapa (b) sai do plano.

> Conferência da exclusão (rodar no console do Railway; ambas devem sair das
> queries por `deletedAt` preenchido ou por não existirem mais):
>
> ```sql
> SELECT id, title, "startDate", "dueDate", "deletedAt"
> FROM "Task"
> WHERE title IN ('New Task', 'teste') OR "dueDate"::time <> '00:00:00';
> ```
>
> Se voltar qualquer linha com `deletedAt IS NULL`, a etapa (b) volta a existir.

Se a etapa (c) exigir normalização antes da conversão de tipo, o script entra
**ali**, não aqui. Requisitos, se vier a existir: `SELECT` do antes, `UPDATE`
filtrado por origem, `SELECT` do depois, transação com rollback fácil. **Nunca
dentro de migration** — seção 6.

### Etapa (c) — ❌ CANCELADA em 2026-07-28

**Não será feita. Nenhuma migration sai deste incidente.** Detalhe e motivo na
seção 8.

Resumo: com a revogação da §7, os campos de tarefa ficam `TIMESTAMP` porque têm
hora. Sobravam três campos sem hora nenhuma, e neles `@db.Date` não corrigiria
bug algum — o `hasTimeComponent` e o `formatDay` já resolvem em código. A troca
seria uma migration num banco sem backup automático, que aplica sozinha no boot
da API (seção 6), em favor de higiene de tipo em campos que não estão quebrados.

---

## 6. Restrição: migration aplica sozinha em produção

`apps/api/railway.json`:

```json
"startCommand": "pnpm --filter @bioinfood/api prisma:deploy && node apps/api/dist/src/main.js"
```

Toda migration presente em `main` é aplicada ao banco de produção no boot da API,
**sem confirmação**. Daí duas regras:

1. A correção de dados da etapa (b) **não vai em migration**. Vai em script
   separado, rodado à mão, com o resultado conferido antes e depois.
2. A migration de tipo da etapa (c) segue a regra das duas publicações de
   [`docs/deploy.md`](../deploy.md) §3.

---

## 7. Decisões de produto tomadas

### ⚠️ REVOGADA — "tarefa de cronograma é dia puro, sem horário"

> Decidida em 2026-07-27, implementada no commit `9b256b3`, **revogada em
> 2026-07-28** e revertida no commit `409dfac`. **Tarefa TEM horário.** Os campos
> "Hora de Início" e "Hora Final" continuam no `TaskFormDialog`.
>
> Está registrada aqui porque três commits do incidente citam a decisão antiga na
> mensagem, e quem for ler o histórico precisa saber que ela caiu.

### Vigente — hora é opcional, e o formato do que se grava depende disso

| Caso | Enviado à API | Por quê |
|---|---|---|
| Data **sem** hora | `'2026-08-10'` | Dia de calendário não tem instante. Era aqui que morava o bug: o `combineDateTime` convertia para UTC mesmo sem hora, e `00:00` local virava `03:00Z` |
| Data **com** hora | `'2026-08-10T12:30:00.000Z'` | Aí existe um momento de verdade: 09:30 em Brasília **é** 12:30Z. Converter está correto — é o que Atividades já faz |

Quem decide o formato é `hasTimeComponent` (`lib/dates.ts`), que checa os
componentes **UTC**. Fazer essa checagem pelo horário local é o erro que gerou o
bug da seção 2.6.

Consequência no Gantt: `toGanttDate` preserva o instante de quem tem hora e usa
`parseCalendarDate` para quem não tem; a persistência grava no formato que o
registro já tinha no servidor. Arrastar barra move dias e **não apaga hora**.

---

## 8. Etapa (c) — ❌ cancelada · o levantamento fica como referência

> **Decidido em 2026-07-28: a etapa (c) não será executada.** A tabela abaixo é o
> levantamento que levou a essa conclusão, não um plano pendente. Ninguém deve
> abrir migration a partir daqui.
>
> Se algum dia alguém quiser retomar, o argumento a derrubar é este: os campos
> que poderiam virar `@db.Date` **não estão quebrados** — a correção de código
> (`hasTimeComponent`, `formatDay`, `parseCalendarDate`) já garante o dia certo na
> escrita e na leitura. O que a migration acrescentaria é impedir que um código
> futuro erre de novo, e isso custa uma alteração de schema em produção que
> aplica sozinha no boot da API, num banco sem backup automático.

### Levantamento por campo

| Campo | Vira | Motivo |
|---|---|---|
| `Task.startDate`, `Task.dueDate` | 🚫 **continua `TIMESTAMP`** | tarefa tem hora opcional (§7). `@db.Date` **apagaria a hora de todos os registros, sem volta** |
| `Task.baselineStart`, `Task.baselineEnd` | **continua `TIMESTAMP`** | é snapshot de `startDate`/`dueDate`; tipo diferente do original quebraria a comparação de desvio |
| `Project.startDate`, `Project.endDate` | `@db.Date` | dia de calendário |
| `Milestone.date` | `@db.Date` | dia de calendário |
| `Opportunity.expectedCloseDate` | `@db.Date` | ver nota abaixo |
| `Task.actualStart`, `Task.actualEnd` | **continua `TIMESTAMP`** | mesma razão da baseline: são comparados com `startDate`/`dueDate`, que ficam `TIMESTAMP`. Ver nota abaixo |
| `Activity.dueDate` | **continua `TIMESTAMP`** | é agenda, hora é significativa |

**`Task.actualStart` / `actualEnd`** — o raciocínio de 2026-07-27 continua válido,
mas a conclusão inverteu junto com a revogação da §7. O argumento era: *não
misturar tipos entre `actual` e `baseline`, senão a conta de desvio em dias ganha
erro de fronteira*. Como `startDate`/`dueDate` **ficam `TIMESTAMP`** (tarefa tem
hora), o que mantém a coerência é `actual` e `baseline` ficarem `TIMESTAMP`
também. Mesma regra, resultado oposto.

**Sobra desta etapa, então, muito pouco.** Só três campos que comprovadamente não
têm hora em lugar nenhum: `Milestone.date`, `Project.startDate`/`endDate` e
`Opportunity.expectedCloseDate`. Nenhum corrige bug — é alinhamento de tipo à
semântica, para impedir que alguém no futuro renderize esses campos com
`toLocaleDateString` e reintroduza o deslocamento. **Vale reavaliar se a etapa (c)
justifica uma migration em produção**, dado que o `hasTimeComponent` e o
`formatDay` já resolvem o problema no código.

**`Opportunity.expectedCloseDate`** — verificado em 2026-07-27: escrito só por
`<Input type="date">` (`opportunity-dialog.tsx:197`), lido só com `.slice(0,10)`
(linha 58), e **não é renderizado em lugar nenhum** do CRM fora do formulário.
Ninguém usa a hora. Por gravar `00:00Z` e nunca passar por conversão local, hoje
é *acidentalmente consistente* — virar `@db.Date` não corrige bug, previne um.
Higiene, não correção.

---

## 9. Resultado das queries de produção

Executadas no console do Railway em **2026-07-27**.

### Q1 — distribuição de horários

| Coluna | Hora | Linhas |
|---|---|---|
| `Task.startDate` | `00:00:00` | 46 |
| `Task.startDate` | `18:20:00` | 1 |
| `Task.dueDate` | `00:00:00` | 46 |
| `Task.dueDate` | `18:23:00` | 1 |
| `Task.baselineStart` / `baselineEnd` | `00:00:00` | 45 cada |
| `Milestone.date` | `00:00:00` | 10 |
| `Project.startDate` | `00:00:00` | 3 |
| `Project.endDate` | `00:00:00` | 2 |
| `Activity.dueDate` | `00:00:00` | 2 |
| `Opportunity.expectedCloseDate` | `00:00:00` | 1 |

**Nenhum registro em `03:00:00`.** A assinatura que o diagnóstico previa como a
massa contaminada **não existe**.

### As três conclusões

**1. Os dados estão corretos.** `00:00:00Z` é a gravação correta de um dia de
calendário. Não há dado deslocado, não há `UPDATE` de correção a fazer. **O bug é
100% de renderização.** A etapa (b) esvaziou.

**2. As duas linhas fora de `00:00`** são a tarefa "teste" criada pelo
`TaskFormDialog` com hora real 15:20 BRT → `18:20:00Z`. Gravação **correta** de um
instante, por um campo que a decisão da seção 7 vai remover.

**3. Reescrita em massa confirmada.** 46 registros com `updatedAt` idêntico ao
milissegundo (`17:20:24.149`), 7s após uma interação no Gantt. Mecanismo e alcance
real em §2.5 — atingiu só `order`, nunca as datas.

### Q4 — o "+1 dia" tem culpado

`RECORD 2`: tarefa com `title` "New Task" (rótulo padrão da SVAR), `createdAt`
16:45, `startDate` 2026-08-02, `dueDate` **2027-06-29**. Não veio do formulário —
veio do botão azul duplicado da SVAR. É o quarto caminho de escrita (§2.4), que o
inventário original não tinha.

Ação: lixo de teste, excluir pela UI.

### Contexto de origem (levantado antes das queries, mantido para referência)

| id | Nome | Datas |
|---|---|---|
| `proj-demo-ingredientes` | Plataforma de Ingredientes Funcionais a partir de Coprodutos | derivadas de `PROJECT_START = 2025-07-01T00:00:00.000Z` |
| `proj-001` | Desenvolvimento de Levedura Especializada | `2024-01-15` / `2024-12-31` |
| `proj-002` | Otimização de Processo Fermentativo | `2024-03-01`, sem término |

`proj-001` e `proj-002` não têm tarefas nem marcos — só `Project.startDate`/
`endDate`. O risco de classificá-los como "cadastro real" num `UPDATE` de
`Project` **deixou de existir** junto com o `UPDATE`, mas fica registrado para o
caso de a etapa (c) precisar de normalização.

---

## 10. Em aberto

1. **🔶 A suíte web é instável sob carga — e `pnpm test` é o portão de deploy.**
   Verificado em 2026-07-28: a suíte completa falhou 11-12 testes, em conjuntos
   **diferentes a cada execução** (`project-dialog`, `pops-client`,
   `risks-client`, `roadmap-client`, `crm/task-dialog`). Os mesmos arquivos
   rodados isoladamente passam 32/32.

   Padrão comum: testes que digitam 200+ caracteres com `userEvent.type` para
   exercitar limite de tamanho, estourando timeout quando a suíte roda em
   paralelo. Não é regressão deste incidente — a base já falhava antes das
   mudanças, confirmado por `git stash`.

   Por que importa: [`docs/deploy.md`](../deploy.md) §2 manda rodar `pnpm test`
   antes de promover para `main`. Uma suíte que falha aleatoriamente treina quem
   opera a ignorar falha vermelha — que é exatamente o hábito que o portão existe
   para impedir. Corrigir fora deste incidente (timeout maior nesses testes, ou
   preencher campo longo via `fireEvent.change` em vez de tecla a tecla).

2. **Marcos (`Milestone`) seguem sem PATCH condicional.** O guard do commit
   `4a319df` cobre só tarefas — o hook recebe os `TaskDto` para comparar, mas não
   os DTOs de marco. O handler de marco continua gravando `date` a qualquer
   `update-task`. Risco menor (marco não tem normalização de duração, então não
   há `+1 dia` a propagar), mas é o mesmo padrão de escrita cega. Fechar passando
   `milestones` para o hook.

3. **`persistOrder` ligado a `move-task` e `indent-task`** resequencia todas as
   tarefas do projeto a cada arrastar. É por desenho (o comentário do arquivo
   explica: `order` é global por projeto), mas 46 escritas para uma ação de
   usuário é desproporcional e vai piorar conforme os projetos crescerem.
   Otimização fora do escopo deste incidente — registrar como dívida.

4. **`lib/crm-tasks.ts` duplica `parseCalendarDate`** nas linhas 73, 89 e 152 —
   cada uma reimplementa `new Date(\`${x.slice(0,10)}T00:00:00\`)` à mão. Está
   **correto hoje**, e por isso ficou fora do escopo deste incidente: mexer nele
   agora seria alterar código que funciona no meio de uma correção de produção.

   **Regra para a próxima pessoa:** na próxima vez que alguém encostar nesse
   arquivo por qualquer motivo, unifique os três pontos em `parseCalendarDate` de
   `lib/dates.ts`. É lógica de fuso duplicada em três lugares — a primeira vez
   que alguém editar um deles sem lembrar dos outros dois, o bug volta.

*(A decisão sobre `Task.actualStart`/`actualEnd`, antes pendente aqui, foi tomada
em 2026-07-27 e está na seção 8.)*
