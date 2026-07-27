# Incidente — deslocamento de fuso nas datas de cronograma

| | |
|---|---|
| **Estado** | Em correção — etapa (a) não iniciada |
| **Aberto em** | 2026-07-27 |
| **Branch** | `fix/timezone-cronograma` (a partir de `develop`) |
| **Impacto** | Datas de tarefa, marco e projeto exibem o dia errado em parte dos registros |
| **Ambiente** | Produção (Railway), ~10 usuários ativos, todos em UTC-3 |

> **Sobre a procedência deste documento.** O diagnóstico original foi feito numa
> sessão que se perdeu. Tudo aqui foi **reverificado contra o código** em
> 2026-07-27, com uma exceção marcada explicitamente na seção 3. Onde este
> documento diverge da memória de alguém, o código é a fonte.

---

## 1. Sintoma

Datas de dia (prazo de tarefa, data de marco, início/término de projeto) aparecem
um dia antes do gravado em parte dos registros. Nem todos — e é justamente a
inconsistência que tornou o diagnóstico difícil.

---

## 2. Causa raiz

Há **dois erros independentes**, um na escrita e um na leitura. Em parte dos
registros eles se cancelam; em parte, não.

### Erro de escrita — `combineDateTime`

`apps/web/app/(dashboard)/projects/[id]/_components/tasks/task-form-dialog.tsx:62`

```ts
function combineDateTime(date: string, time: string | undefined): string {
  return new Date(`${date}T${time || '00:00'}:00`).toISOString();
}
```

`new Date('2026-10-01T00:00:00')` — sem `Z` — é interpretado como meia-noite
**local**. `.toISOString()` converte para UTC e produz `2026-10-01T03:00:00.000Z`.
O banco recebe 03:00Z para o que o usuário digitou como "1º de outubro".

### Erro de leitura — `fmtCol` e os renderizadores

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

### Por que ninguém percebeu antes

| Origem do registro | Gravado | Lido com `new Date()` em UTC-3 | Resultado |
|---|---|---|---|
| Seed (`new Date('2025-07-01')`) | `00:00:00Z` | 30/06 21:00 | **dia errado** |
| Formulário (caminho A) | `03:00:00Z` | 01/07 00:00 | **dia certo, por acidente** |

Tarefa criada pelo formulário exibe o dia correto porque o erro de escrita
cancela o de leitura. Isso só é verdade em UTC-3 — **e todos os usuários estão em
UTC-3**. Um usuário em qualquer outro fuso veria as duas classes erradas.

Confirmado empiricamente em 2026-07-27: tarefa criada pelo `TaskFormDialog` exibe
data e hora corretas no Gantt. O "+1 dia" relatado originalmente era leitura de
uma linha do seed.

**Consequência para o plano:** corrigir só a leitura faz os registros do caminho A
passarem a exibir 03:00 — quebra o que hoje funciona. Escrita e leitura têm que
ir no **mesmo deploy**.

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

### Etapa (a) — parar o sangramento · front puro · 1 deploy

Ordem dos commits:

1. **`combineDateTime` + `fmtCol` juntos.** Interdependentes: separá-los faz os
   registros do caminho A passarem a exibir 03:00. `combineDateTime` passa a
   emitir `YYYY-MM-DD`; `fmtCol` passa a usar `parseCalendarDate`.
2. **Os 6 renderizadores de troca simples** — `backlog-row`, `kanban-card`,
   `project-card`, `projects-table`, `dashboard/page` (global) e
   `lib/project-report`. Troca de implementação, sem mudar assinatura. **Sem**
   tocar `pop-row` (falso positivo verificado) e **sem** o `charter-client`.
3. **Split do `charter-client` em `fmtInstant` / `fmtDay`** — commit próprio. É o
   único ponto que muda **assinatura de função** em vez de trocar implementação,
   e misturá-lo com o commit 2 esconderia essa diferença no diff.
4. **`use-gantt-persistence` com PATCH condicional** — commit isolado. É o mais
   arriscado (escrita otimista com reversão) e precisa poder ser revertido
   sozinho.
5. **Remoção dos campos de hora do `TaskFormDialog`** — ver decisão de produto
   na seção 7.

### Etapa (b) — corrigir os dados já gravados · script manual

Script em `scripts/`, **executado à mão** depois que (a) estiver no ar e
confirmado. Requisitos:

- `SELECT` do antes nas linhas afetadas;
- `UPDATE` filtrado **por origem**, nunca global;
- `SELECT` do depois;
- transação com rollback fácil.

**Não pode ir dentro de migration** — ver seção 6.

### Etapa (c) — alinhar o tipo no banco · duas publicações

`@db.Date` nos campos que são dia de calendário. Detalhe na seção 8.

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

**Tarefa de cronograma é dia puro, sem horário.** Os campos `startTime`/`endTime`
saem do `TaskFormDialog`. Razão: o Gantt trabalha em dias, duração é em dias e
baseline é em dias. Quem precisa marcar compromisso com hora usa **Activity**, que
já existe e já tem semântica de agenda.

Consequência direta: com dia puro, o `combineDateTime` deixa de ter razão de
existir — some junto com os campos.

---

## 8. Etapa (c) — campos por tipo

| Campo | Vira | Motivo |
|---|---|---|
| `Task.startDate`, `Task.dueDate` | `@db.Date` | dia de calendário |
| `Task.baselineStart`, `Task.baselineEnd` | `@db.Date` | dia de calendário |
| `Project.startDate`, `Project.endDate` | `@db.Date` | dia de calendário |
| `Milestone.date` | `@db.Date` | dia de calendário |
| `Opportunity.expectedCloseDate` | `@db.Date` | ver nota abaixo |
| `Task.actualStart`, `Task.actualEnd` | `@db.Date` | ver nota abaixo |
| `Activity.dueDate` | **continua `TIMESTAMP`** | é agenda, hora é significativa |

**`Task.actualStart` / `actualEnd`** — decidido em 2026-07-27: `@db.Date`, junto
com o resto. O desvio de cronograma do dashboard ("11 dias além do planejado") é
`actual` menos `baseline`, contado em **dias**. Se a baseline vira `Date` e o
actual fica `TIMESTAMP`, a comparação é entre tipos diferentes e reintroduz erro
de fronteira: tarefa concluída às 22h contaria um dia a mais de atraso. A
auditoria de "quando foi marcada" já está coberta por `updatedAt` — não precisa
ser duplicada em `actualEnd`.

**`Opportunity.expectedCloseDate`** — verificado em 2026-07-27: escrito só por
`<Input type="date">` (`opportunity-dialog.tsx:197`), lido só com `.slice(0,10)`
(linha 58), e **não é renderizado em lugar nenhum** do CRM fora do formulário.
Ninguém usa a hora. Por gravar `00:00Z` e nunca passar por conversão local, hoje
é *acidentalmente consistente* — virar `@db.Date` não corrige bug, previne um.
Higiene, não correção.

---

## 9. Resultado das queries de produção

> Queries entregues em 2026-07-27, aguardando execução no console do Railway.
> **Colar o resultado aqui quando vier.**

Assinaturas conhecidas antes de rodar:

| Hora gravada | Origem esperada |
|---|---|
| `00:00:00` | seed (`new Date('2025-07-01')` → UTC exato) |
| `03:00:00` | caminho A — `combineDateTime` em UTC-3 |
| qualquer outra | **não mapeado — para tudo e reavalia o plano** |

Projetos criados por seed (para o filtro por origem da etapa (b)):

| id | Nome | Datas |
|---|---|---|
| `proj-demo-ingredientes` | Plataforma de Ingredientes Funcionais a partir de Coprodutos | derivadas de `PROJECT_START = 2025-07-01T00:00:00.000Z` |
| `proj-001` | Desenvolvimento de Levedura Especializada | `2024-01-15` / `2024-12-31` |
| `proj-002` | Otimização de Processo Fermentativo | `2024-03-01`, sem término |

`proj-001` e `proj-002` **não têm tarefas nem marcos** no seed — só
`Project.startDate`/`endDate`. Um `UPDATE` de `Project` que os classifique como
"cadastro real" aplicaria shift errado neles.

### Q1 — distribuição de horários

```
(colar)
```

### Q2 — origem por assinatura

```
(colar)
```

### Q3 — linhas que exibem o dia errado

```
(colar)
```

---

## 10. Em aberto

1. **"Caminho B" não está definido neste documento.** O rótulo vem do diagnóstico
   original e não foi recuperado. As queries classificam por assinatura
   observável; o mapeamento assinatura → caminho precisa ser feito quando o
   resultado voltar.
2. **`lib/crm-tasks.ts` duplica `parseCalendarDate`** nas linhas 73, 89 e 152 —
   cada uma reimplementa `new Date(\`${x.slice(0,10)}T00:00:00\`)` à mão. Está
   **correto hoje**, e por isso ficou fora do escopo deste incidente: mexer nele
   agora seria alterar código que funciona no meio de uma correção de produção.

   **Regra para a próxima pessoa:** na próxima vez que alguém encostar nesse
   arquivo por qualquer motivo, unifique os três pontos em `parseCalendarDate` de
   `lib/dates.ts`. É lógica de fuso duplicada em três lugares — a primeira vez
   que alguém editar um deles sem lembrar dos outros dois, o bug volta.

*(A decisão sobre `Task.actualStart`/`actualEnd`, antes pendente aqui, foi tomada
em 2026-07-27 e está na seção 8.)*
