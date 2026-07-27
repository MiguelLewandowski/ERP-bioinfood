// Agrega o andamento das tarefas por pacote da EAP. Funções puras — recebem os
// DTOs que a página já buscou e devolvem só a contagem por nó. Não há endpoint
// de rollup: `Task` já carrega o `wbsNode` a que pertence, então a soma é local.
//
// Regra do rollup: um pacote conta as tarefas ligadas a ele **e a todos os seus
// descendentes**. É o que faz o nível 1 responder "quanto deste entregável está
// pronto" sem que ninguém precise abrir a árvore.

import type { TaskDto, WbsNodeDto } from '@bioinfood/shared';

/** Profundidade máxima percorrida ao subir a árvore — trava contra ciclo em `parentId`. */
const MAX_DEPTH = 50;

export interface WbsRollup {
  /** Tarefas ativas do pacote e de seus descendentes. */
  total: number;
  done: number;
  /** Percentual concluído (0–100, inteiro). 0 quando o pacote não tem tarefa. */
  progress: number;
}

export interface WbsIndex {
  /** nodeId → id do pai, apenas quando o pai existe na lista. */
  parentOf: Map<string, string>;
  /**
   * nodeId → id do pacote de nível 1 que o contém (ele mesmo, se for raiz).
   *
   * Não é usado pelo rollup: existe para o agrupamento por pacote no Gantt,
   * que precisa saber a que entregável raiz cada tarefa pertence.
   */
  rootOf: Map<string, string>;
}

/**
 * Índice de navegação da árvore da EAP.
 *
 * Um `parentId` que aponta para um nó ausente (filho de pacote excluído) é
 * tratado como raiz — o mesmo critério do `buildTree` da tela, para os dois não
 * divergirem.
 */
export function buildWbsIndex(nodes: WbsNodeDto[]): WbsIndex {
  const known = new Set(nodes.map((n) => n.id));
  const parentOf = new Map<string, string>();
  for (const node of nodes) {
    if (node.parentId && known.has(node.parentId)) parentOf.set(node.id, node.parentId);
  }

  const rootOf = new Map<string, string>();
  for (const node of nodes) {
    let current = node.id;
    for (let hops = 0; hops < MAX_DEPTH; hops += 1) {
      const parent = parentOf.get(current);
      if (!parent) break;
      current = parent;
    }
    rootOf.set(node.id, current);
  }

  return { parentOf, rootOf };
}

/**
 * Andamento de cada pacote da EAP, já somando os descendentes.
 *
 * Tarefa excluída (soft delete) não entra. Tarefa sem pacote não entra em nó
 * nenhum — ela aparece no Backlog, não na EAP.
 */
export function computeWbsRollup(nodes: WbsNodeDto[], tasks: TaskDto[]): Map<string, WbsRollup> {
  const { parentOf } = buildWbsIndex(nodes);
  const rollup = new Map<string, WbsRollup>();
  for (const node of nodes) rollup.set(node.id, { total: 0, done: 0, progress: 0 });

  for (const task of tasks) {
    if (task.deletedAt) continue;
    const nodeId = task.wbsNode?.id;
    if (!nodeId || !rollup.has(nodeId)) continue;

    // Credita a tarefa no pacote dela e em cada ancestral até a raiz.
    let current: string | undefined = nodeId;
    for (let hops = 0; current && hops < MAX_DEPTH; hops += 1) {
      const entry = rollup.get(current);
      if (!entry) break;
      entry.total += 1;
      if (task.status === 'DONE') entry.done += 1;
      current = parentOf.get(current);
    }
  }

  for (const entry of rollup.values()) {
    entry.progress = entry.total === 0 ? 0 : Math.round((entry.done / entry.total) * 100);
  }

  return rollup;
}
