// Delta de reordenação de tarefas.
//
// `Task.order` é um campo GLOBAL por projeto — não por nível da árvore nem por
// coluna. Por isso Gantt e Backlog sempre calcularam a lista COMPLETA ao
// reordenar: resequenciar só o subconjunto visível colidiria com o `order` de
// quem está fora dele (no Gantt, as tarefas sem data).
//
// Calcular a lista completa continua certo. Gravá-la inteira é que não era: uma
// ação do usuário virava um UPDATE por tarefa do projeto, todos carimbando
// `updatedAt`. Isso já custou caro num diagnóstico — 46 registros com
// `updatedAt` idêntico ao milissegundo pareciam corrupção em massa e eram um
// único arrastar (docs/incidentes/timezone-cronograma.md §2.5).
//
// A lista desejada é absoluta; o delta é só o que muda no banco.

export interface TaskOrderItem {
  id: string;
  order: number;
}

/**
 * Itens cujo `order` difere do que se sabe estar gravado.
 *
 * `desired` é a lista COMPLETA na ordem final — inclusive o que não aparece na
 * tela que originou o arrastar. `currentOrderOf` devolve o `order` conhecido de
 * cada id, ou `undefined` quando não se sabe (tarefa nova): sem valor conhecido
 * o item entra no delta, porque presumir que já está certo é o único erro aqui
 * que grava ordem errada em silêncio.
 */
export function taskOrderDelta(
  desired: string[],
  currentOrderOf: (id: string) => number | undefined,
): TaskOrderItem[] {
  return desired
    .map((id, order) => ({ id, order }))
    .filter(({ id, order }) => currentOrderOf(id) !== order);
}
