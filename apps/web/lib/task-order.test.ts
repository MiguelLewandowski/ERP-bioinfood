import { describe, it, expect } from 'vitest';
import { arrayMove } from '@dnd-kit/sortable';
import { taskOrderDelta } from './task-order';

/** Projeto com 8 tarefas já resequenciadas (order = índice). */
const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const CURRENT = new Map(IDS.map((id, i) => [id, i]));
const orderOf = (id: string) => CURRENT.get(id);

describe('taskOrderDelta', () => {
  // Um arrastar virava um UPDATE por tarefa do projeto — 46 escritas para mover
  // uma linha, todas carimbando `updatedAt`.
  it('should send only the tasks whose order actually changed', () => {
    const desired = arrayMove(IDS, 5, 4); // 'f' sobe uma posição

    const delta = taskOrderDelta(desired, orderOf);

    expect(delta).toEqual([
      { id: 'f', order: 4 },
      { id: 'e', order: 5 },
    ]);
  });

  it('should not call the API when the drag ends where it started', () => {
    expect(taskOrderDelta(IDS, orderOf)).toEqual([]);
  });

  // Mover do fim para o começo desloca todo mundo — aí escrever tudo está certo.
  it('should still send the whole list when the move really shifts everything', () => {
    const desired = arrayMove(IDS, 7, 0);

    expect(taskOrderDelta(desired, orderOf)).toHaveLength(8);
  });

  /**
   * A armadilha do problema: tarefa sem data não aparece no Gantt mas ocupa
   * `order`. Ela entra na lista desejada no fim, e como já estava lá, fica fora
   * do delta — a ordem relativa dela se preserva sem escrita nenhuma.
   */
  it('should keep the relative order of tasks without dates', () => {
    const dated = ['a', 'b', 'c'];
    const undated = ['x', 'y'];
    const current = new Map([...dated, ...undated].map((id, i) => [id, i]));

    const desired = [...arrayMove(dated, 2, 0), ...undated];
    const delta = taskOrderDelta(desired, (id) => current.get(id));

    expect(delta.map((d) => d.id)).not.toContain('x');
    expect(delta.map((d) => d.id)).not.toContain('y');
  });

  /**
   * A regressão que mais dói: Gantt e Backlog gravam no MESMO campo global. Se
   * calcularem `order` de formas diferentes, brigam entre si e a ordem oscila
   * conforme a tela em que o usuário mexeu por último.
   */
  it('should produce the same final order as the backlog for the same move', () => {
    const move = { from: 6, to: 2 };

    // Backlog: lista visível é a lista toda.
    const backlogDesired = arrayMove(IDS, move.from, move.to);

    // Gantt: visíveis (com data) + as sem data anexadas depois. Aqui todas têm
    // data, então as duas listas desejadas têm de coincidir.
    const ganttVisible = arrayMove(IDS, move.from, move.to);
    const ganttDesired = [...ganttVisible];

    expect(ganttDesired).toEqual(backlogDesired);
    expect(taskOrderDelta(ganttDesired, orderOf)).toEqual(taskOrderDelta(backlogDesired, orderOf));
  });

  // Tarefa recém-criada não tem `order` conhecido. Presumir que já está certa é
  // o único erro aqui que grava ordem errada em silêncio.
  it('should include a task whose current order is unknown', () => {
    const desired = [...IDS, 'nova'];

    const delta = taskOrderDelta(desired, orderOf);

    expect(delta).toEqual([{ id: 'nova', order: 8 }]);
  });
});
