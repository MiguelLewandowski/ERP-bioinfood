---
tipo: bug
escopo: web
complexidade: baixa
status: concluída
concluida: 2026-07-29
criada: 2026-07-28
tema: cronograma
---

# Aplicar o PATCH condicional também aos marcos no Gantt

> ✅ **Concluída em 2026-07-29.** Implementada como planejado: `milestones` nas
> `Options`, `MilestoneSnapshot` + `lastPersistedMilestone`, comparação antes de
> enviar. Testes em `use-gantt-persistence.test.tsx`, com o `fakeGanttApi` que
> esta tarefa sugeriu.
>
> **⚠️ Achado que contraria o "Fora de escopo" desta tarefa:** o ramo de TAREFA
> **não estava correto**. `snapshotOf` semeava o snapshot com
> `dayKey(dto.startDate)`, que faz `new Date(string)` — e o ISO de meia-noite UTC
> da API vira 21h do dia ANTERIOR em Brasília, enquanto a store, montada por
> `toGanttDate`, calculava o dia certo. Os dois nunca batiam, então o PATCH
> condicional **se anulava para datas**: renomear uma tarefa reenviava
> `startDate` e `dueDate` junto — exatamente o que o guard existe para impedir.
>
> Corrigido com `dtoDayKey`, que amarra a semeadura à mesma conversão da store.
> Coberto por `should not resend dates when only the title changed`.

## Anotação original
> Marcos (Milestone) ainda não têm PATCH condicional no `use-gantt-persistence`.
> O guard do commit `4a319df` cobre só tarefas — o hook recebe os `TaskDto` para
> comparar, mas não os DTOs de marco. O handler de marco continua gravando `date`
> a qualquer `update-task`. Fechar passando `milestones` para o hook.

## Contexto

O Gantt persiste edições reagindo a eventos da SVAR. A biblioteca emite o objeto
**inteiro** da linha a cada `update-task`, não só o campo mexido — então um
handler que reenvia tudo grava campos que ninguém tocou.

Isso já causou dano real com tarefas: a normalização de exibição (`addDays` para
barra de duração zero) era gravada de volta no banco, e daí saía o "+1 dia" do
incidente `docs/incidentes/timezone-cronograma.md` §2.4(a). O commit `4a319df`
fechou esse caminho **para tarefas**. Marcos ficaram de fora.

## Comportamento atual

`apps/web/app/(dashboard)/projects/[id]/gantt/_components/use-gantt-persistence.ts:154-161`

```ts
if (isMilestoneId(ev.id)) {
  const data: Record<string, unknown> = {};
  if (t.text !== undefined) data.title = t.text;
  if (t.start) data.date = dayKey(t.start);
  if (t.progress !== undefined) data.reached = t.progress >= 100;
  if (Object.keys(data).length === 0) return;
  milestonesApi.update(projectId, stripMs(ev.id), data, token).catch(onError);
  return;
}
```

O guard é só `!== undefined` / truthy: verifica se o campo **veio no evento**, não
se ele **mudou**. Renomear um marco reenvia `date` e `reached` junto.

Para comparação, o caminho de tarefa (linhas 165-200 do mesmo arquivo) compara
cada campo com `lastPersisted`, um snapshot do que se sabe estar no servidor, e
só envia o que de fato mudou.

## Comportamento esperado

Editar um marco envia **apenas** o campo alterado. Renomear manda só `title`;
arrastar manda só `date`; marcar como atingido manda só `reached`.

## Como reproduzir

1. Abrir o Gantt de um projeto com marcos
2. Renomear um marco pelo editor da SVAR (duplo clique)
3. Inspecionar a requisição `PATCH /projects/:id/milestones/:msId` no DevTools
4. Resultado: o corpo traz `title`, `date` e `reached` · Esperado: só `title`

## Causa provável

Confirmada por leitura. O hook recebe `tasks: TaskDto[]` nas opções
(`use-gantt-persistence.ts:19`) e monta `lastPersisted` a partir deles, mas
**não recebe os `MilestoneDto`** — então não há com o que comparar no ramo de
marco, e o guard cai no "enviar o que veio".

`gantt-client.tsx` já tem os marcos em mãos (`props.milestones`, usados em
`buildGanttTasks`), só não os repassa ao hook.

## Arquivos envolvidos

| Arquivo | O que muda |
|---|---|
| `apps/web/app/(dashboard)/projects/[id]/gantt/_components/use-gantt-persistence.ts` | receber `milestones` nas `Options`; snapshot e comparação no ramo de marco |
| `apps/web/app/(dashboard)/projects/[id]/gantt/_components/gantt-client.tsx` | passar `milestones` ao `useGanttPersistence` |

## Plano de implementação

1. Acrescentar `milestones: MilestoneDto[]` à interface `Options`.
2. Em `gantt-client.tsx`, passar `milestones` na chamada do hook (o componente já
   os tem como prop).
3. Criar `MilestoneSnapshot` (`title`, `day`, `reached`) e `snapshotOfMilestone`,
   espelhando o que existe para tarefa.
4. Manter um `lastPersistedMilestone: Map<string, MilestoneSnapshot>`, semeado sob
   demanda a partir do DTO — mesmo padrão do ramo de tarefa.
5. No ramo de marco, montar `data` comparando com o snapshot; se nada mudou,
   `return` sem chamar a API. Atualizar o snapshot após enviar.
6. `/testes` para os casos abaixo.

## Critérios de aceite

- [ ] Renomear um marco envia `PATCH` só com `title`
- [ ] Arrastar um marco envia `PATCH` só com `date`
- [ ] Marcar/desmarcar como atingido envia `PATCH` só com `reached`
- [ ] Evento sem mudança real não dispara requisição nenhuma
- [ ] `date` continua sendo enviado como `YYYY-MM-DD`, não ISO com hora
- [ ] Build e testes verdes (`pnpm test`)

## Testes a escrever

Não há teste do `use-gantt-persistence` hoje — o hook depende da instância `api`
da SVAR, o que exige um dublê que emita os eventos. Sugestão: um `fakeGanttApi`
com `on`/`intercept` guardando os handlers, permitindo dispará-los à mão.

- `should send only the title when a milestone is renamed`
- `should send only the date when a milestone is dragged`
- `should send only the reached flag when a milestone is checked`
- `should not call the API when the milestone event carries no real change`
- `should send the milestone date as a calendar day, not an instant`

O último importa: `Milestone.date` virou coluna `DATE` na migration
`20260728112520_calendar_day_columns`. Enviar ISO com hora passa a ser truncado
pelo banco em silêncio.

## Riscos e efeitos colaterais

- Baixo. Marco não tem normalização de duração, então **não há `+1 dia` a
  propagar** — este é o mesmo padrão de escrita cega, mas sem o vetor de
  corrupção que existia em tarefa.
- O `reached` deriva de `progress >= 100`: a SVAR trata marco como barra de
  progresso 0 ou 100. Preservar essa conversão ao introduzir a comparação.
- Se `lastPersisted` for semeado do DTO enquanto uma escrita otimista está em
  voo, pode haver divergência momentânea. O ramo de tarefa já convive com isso;
  seguir o mesmo desenho em vez de inventar outro.

## Decisões em aberto

Nenhuma.

## Fora de escopo

- Reescrever o ramo de tarefa, que já está correto.
- Unificar os dois ramos numa abstração comum. Tentador, mas as entidades têm
  campos diferentes (`dueDate`/`status` vs `date`/`reached`) e a fusão
  provavelmente sairia pior que a duplicação.
