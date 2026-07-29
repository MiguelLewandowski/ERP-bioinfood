---
tipo: feature
escopo: web
complexidade: média
status: concluída
concluida: 2026-07-29
criada: 2026-07-28
tema: cronograma
---

# Reduzir a escrita de reordenar no Gantt, que reescreve o projeto inteiro

> ✅ **Concluída em 2026-07-29.**
>
> **Passo 1 confirmou a suspeita:** o Backlog tinha o mesmo padrão
> (`reordered.map((t, i) => ...)` gravava a lista toda). Os dois foram corrigidos
> pelo **mesmo helper**, `apps/web/lib/task-order.ts` — eles escrevem no mesmo
> campo global, e divergir ali é justamente como brigariam.
>
> A lista desejada continua **completa** (é o que mantém os dois consistentes);
> só o delta vai para a API. Arrastar uma posição escreve ~2 linhas; arrastar e
> devolver ao lugar não escreve nada.
>
> **Detalhe que quase virou bug:** o delta precisa comparar contra o que a
> ÚLTIMA escrita gravou, não contra o `order` do DTO — que fica velho no primeiro
> arrastar. Sem isso o segundo arrastar **pularia** linhas que precisavam mudar.
> Resolvido com `lastKnownOrder` no Gantt e `order` atualizado no estado local do
> Backlog. Coberto por `should compare the second drag against what the first one wrote`.
>
> O aviso da §2.5 do incidente de fuso foi atualizado: `updatedAt` voltou a ser
> critério de origem confiável para dados a partir de 2026-07-29.
>
> **A "decisão em aberto" (vale a pena agora?) foi resolvida por contexto:** a
> Onda 6 de UI ligou o agrupamento por pacote no Gantt, o que aumenta o número de
> linhas na store e torna o resequenciamento total mais caro. Fazer junto saiu
> mais barato que fazer depois.

## Anotação original
> `persistOrder` está ligado a `move-task` E `indent-task` e resequencia TODAS as
> tarefas do projeto a cada arrastar — 46 escritas para uma ação de usuário. É por
> desenho, documentado no comentário do arquivo, porque `order` é global por
> projeto. Mas é desproporcional e piora conforme os projetos crescerem. Efeito
> colateral já sentido: `updatedAt` deixou de servir como critério de origem em
> diagnóstico, porque o projeto inteiro é carimbado a cada arrastar.

## Contexto

Arrastar uma tarefa no Gantt para mudar a posição dispara um resequenciamento de
`order` — que é um campo **global por projeto**, não por nível da árvore. O
desenho atual reescreve a lista toda para manter a consistência com o Backlog,
que grava do mesmo jeito.

Funciona e não corrompe nada. O problema é a proporção: uma ação do usuário vira
dezenas de `UPDATE`, e isso escala com o tamanho do projeto, não com o tamanho da
mudança.

Já produziu um efeito colateral concreto: durante o diagnóstico de
`docs/incidentes/timezone-cronograma.md`, 46 registros apareceram com `updatedAt`
idêntico ao milissegundo, o que parecia corrupção em massa. Era um único arrastar.
`updatedAt` deixou de distinguir "editado por gente" de "tocado pelo sistema"
neste projeto — está registrado em §2.5 e no item 1 da §10 do incidente.

## Comportamento atual

`apps/web/app/(dashboard)/projects/[id]/gantt/_components/use-gantt-persistence.ts:246-257`

```ts
const persistOrder = (ev: any) => {
  if (ev.inProgress) return;
  const flat = api.getState().tasks.toArray() as Array<{ id: unknown }>;
  const orderedIds = flat.filter((t) => !isMilestoneId(t.id)).map((t) => resolveTaskId(t.id));
  const orderedSet = new Set(orderedIds);
  const remainingIds = allTasksRef.current
    .filter((t) => !orderedSet.has(t.id))
    .map((t) => t.id);
  const items = [...orderedIds, ...remainingIds].map((id, index) => ({ id, order: index }));
  if (items.length === 0) return;
  tasksApi.reorder(projectId, items, token).catch(onError);
};
```

Ligado duas vezes, nas linhas 259-262:

```ts
api.on('move-task', persistParent);
api.on('move-task', persistOrder);
api.on('indent-task', persistParent);
api.on('indent-task', persistOrder);
```

No backend, `apps/api/src/modules/tasks/infra/tasks.prisma.repository.ts:76-84`
executa **um `updateMany` por item**, dentro de uma transação:

```ts
await this.prisma.$transaction(
  items.map(({ id, order }) =>
    this.prisma.task.updateMany({ where: { id, projectId }, data: { order } }),
  ),
);
```

Ou seja: 46 tarefas = 46 `UPDATE` numa transação, todos com `updatedAt` novo,
independentemente de o `order` ter mudado.

## Comportamento esperado

Arrastar uma tarefa escreve **apenas as linhas cujo `order` de fato mudou**.
Reordenação continua correta e consistente com o Backlog; `updatedAt` volta a
refletir mudança real.

## Causa provável

Não é bug — é decisão de desenho, e o comentário no arquivo explica bem o porquê:
`order` é global, o Gantt só mostra tarefas com data, e resequenciar apenas o
subconjunto visível colidiria com o `order` das tarefas sem data.

O que falta é o passo seguinte: **calcular a lista completa e enviar só o delta**.
Mover um item numa lista ordenada altera o `order` de quem está entre a posição
antiga e a nova — tipicamente poucos itens, não todos.

## Arquivos envolvidos

| Arquivo | O que muda |
|---|---|
| `apps/web/.../gantt/_components/use-gantt-persistence.ts` | filtrar o delta antes de chamar `reorder` |
| `apps/api/src/modules/tasks/infra/tasks.prisma.repository.ts` | opcionalmente, uma única query em vez de N `updateMany` |
| `apps/web/app/(dashboard)/projects/[id]/backlog/` | verificar se o Backlog tem o mesmo padrão |

## Plano de implementação

1. Verificar como o **Backlog** persiste ordem. Se tiver o mesmo problema, a
   correção deve valer para os dois — senão os dois caminhos divergem e o próximo
   diagnóstico fica pior.
2. Em `persistOrder`, comparar a lista calculada com o `order` atual de
   `allTasksRef.current` e enviar só os itens em que o valor mudou.
3. Se o delta for vazio, não chamar a API. Hoje um arrastar que devolve a tarefa
   ao lugar original ainda escreve 46 linhas.
4. Medir: arrastar uma tarefa uma posição para cima num projeto de 46 tarefas
   deve escrever ~2 linhas, não 46.
5. **Opcional, backend:** trocar os N `updateMany` por um `UPDATE ... FROM
   (VALUES ...)` só se o passo 2 não bastar. Com o delta pequeno, a transação de N
   queries deixa de ser problema.
6. `/testes` para o delta.

## Critérios de aceite

- [ ] Arrastar uma tarefa uma posição altera o `order` de no máximo as tarefas
      entre a origem e o destino
- [ ] Arrastar e devolver ao lugar original não dispara requisição
- [ ] A ordem final no Backlog continua idêntica à do Gantt após reordenar
- [ ] Tarefas **sem data** (invisíveis no Gantt) mantêm a ordem relativa entre si
- [ ] `updatedAt` de tarefa não envolvida no arrastar permanece inalterado
- [ ] Build e testes verdes (`pnpm test`)

## Testes a escrever

- `should send only the tasks whose order actually changed`
- `should not call the API when the drag ends where it started`
- `should keep the relative order of tasks without dates`
- `should produce the same final order as the backlog for the same move`

O quarto é o que protege contra a regressão real: Gantt e Backlog gravando
`order` de formas diferentes e brigando entre si.

## Riscos e efeitos colaterais

- **A consistência com o Backlog é a parte frágil.** O comentário atual explica
  que resequenciar tudo era a forma de garantir que os dois não divergissem;
  qualquer otimização precisa preservar isso, e é por isso que o passo 1 vem
  antes de tudo.
- Tarefas sem data não aparecem no Gantt mas ocupam `order`. É a armadilha do
  problema — o cálculo do delta tem que considerá-las mesmo sem exibi-las.
- Se o item 1 da §10 do incidente (`updatedAt` inútil como critério de origem)
  for resolvido por esta tarefa, **atualizar aquele texto** — senão fica um aviso
  vencido orientando diagnóstico futuro.

## Decisões em aberto

**Vale a pena agora?** Com 46 tarefas e ~10 usuários, o custo real é
imperceptível. O argumento a favor é o efeito de diagnóstico (`updatedAt`
inutilizado) e o crescimento futuro; o argumento contra é mexer em código que
funciona, num caminho que já causou incidente. Decisão do desenvolvedor sobre
prioridade — a tarefa está pronta para quando ele quiser.

## Fora de escopo

- Mudar `order` de global para escopo por nível da árvore. Seria a solução de
  raiz, mas é `/planejar`, não uma tarefa: mexe no Backlog, no Kanban e no schema.
- `persistParent`, que já envia só o campo do pai.
