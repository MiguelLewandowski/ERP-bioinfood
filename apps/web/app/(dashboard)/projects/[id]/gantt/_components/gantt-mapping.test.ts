import { describe, it, expect } from 'vitest';
import type { MilestoneDto, TaskDto, WbsNodeDto } from '@bioinfood/shared';
import {
  buildGanttTasks, buildGroupLabels, fmtDuration, fmtProgress,
  zoomConfig, ZOOM_LEVELS, UNGROUPED_LABEL,
} from './gantt-mapping';

function makeTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 't1',
    title: 'Extração',
    status: 'TODO',
    startDate: '2026-08-03T00:00:00.000Z',
    dueDate: '2026-08-10T00:00:00.000Z',
    baselineStart: null,
    baselineEnd: null,
    parentId: null,
    assignee: null,
    checklist: [],
    deletedAt: null,
    ...overrides,
  } as unknown as TaskDto;
}

// O ISO da API é meia-noite UTC. Em America/Sao_Paulo, `new Date()` sobre ele dá
// 21h do dia ANTERIOR — a barra inteira nascia deslocada. Estes testes travam o
// dia de calendário, e passam em qualquer fuso porque `parseCalendarDate` monta
// meia-noite local do dia que veio na string.
describe('buildGanttTasks — dia de calendário', () => {
  it('should keep the calendar day of the start date', () => {
    const [task] = buildGanttTasks([makeTask()], []);

    expect(task.start.getFullYear()).toBe(2026);
    expect(task.start.getMonth()).toBe(7); // agosto
    expect(task.start.getDate()).toBe(3);
  });

  it('should keep the calendar day of the due date', () => {
    const [task] = buildGanttTasks([makeTask()], []);

    expect(task.end.getDate()).toBe(10);
  });

  it('should place the bar at local midnight, not at 21h of the day before', () => {
    const [task] = buildGanttTasks([makeTask()], []);

    expect(task.start.getHours()).toBe(0);
    expect(task.start.getMinutes()).toBe(0);
  });

  it('should keep the calendar day of the baseline', () => {
    const [task] = buildGanttTasks([
      makeTask({ baselineStart: '2026-08-01T00:00:00.000Z', baselineEnd: '2026-08-09T00:00:00.000Z' }),
    ], []);

    expect(task.base_start?.getDate()).toBe(1);
    expect(task.base_end?.getDate()).toBe(9);
  });

  it('should keep the calendar day of a milestone', () => {
    const milestone = { id: 'm1', title: 'Entrega', date: '2026-09-30T00:00:00.000Z', reached: false } as unknown as MilestoneDto;

    const [item] = buildGanttTasks([], [milestone]);

    expect(item.start.getMonth()).toBe(8); // setembro
    expect(item.start.getDate()).toBe(30);
  });

  // Tarefa COM hora é outro caso: o instante é a informação, e achatá-lo para
  // meia-noite perderia o que o usuário digitou. 12:30Z é 09:30 em Brasília.
  it('should keep the real time when the task has one', () => {
    const [task] = buildGanttTasks([
      makeTask({ startDate: '2026-08-03T12:30:00.000Z' }),
    ], []);

    expect(task.start.getDate()).toBe(3);
    expect(task.start.getHours()).toBe(9);
    expect(task.start.getMinutes()).toBe(30);
  });

  it('should not push the end date when the task starts and ends on the same day', () => {
    const [task] = buildGanttTasks([
      makeTask({ startDate: '2026-08-03T00:00:00.000Z', dueDate: '2026-08-03T00:00:00.000Z' }),
    ], []);

    expect(task.end.getDate()).toBe(3);
    expect(task.end.getTime()).toBe(task.start.getTime());
  });
});

describe('fmtDuration', () => {
  it('should show the duration in days', () => {
    expect(fmtDuration(15)).toBe('15d');
  });

  // O caso que a remoção do addDays expôs: com dueDate == startDate a diferença
  // é zero, zero é falsy, e a célula saía vazia.
  it('should show 1d when the task starts and ends on the same day', () => {
    expect(fmtDuration(0)).toBe('1d');
  });

  it('should not fall back to 0d or an empty cell for a zero length task', () => {
    expect(fmtDuration(0)).not.toBe('0d');
    expect(fmtDuration(0)).not.toBe('');
  });

  it('should floor a negative duration at 1d', () => {
    expect(fmtDuration(-3)).toBe('1d');
  });

  it('should show nothing when there is no duration to show', () => {
    expect(fmtDuration(undefined)).toBe('');
    expect(fmtDuration(null)).toBe('');
    expect(fmtDuration('')).toBe('');
  });

  it('should show nothing when the value is not a number', () => {
    expect(fmtDuration('abc')).toBe('');
    expect(fmtDuration(NaN)).toBe('');
  });

  it('should accept a numeric string from the widget', () => {
    expect(fmtDuration('7')).toBe('7d');
  });
});

/**
 * A ordenação por `wbsNodeId` sempre esteve correta — a revisão a leu como
 * "agrupamento inconsistente" porque nada dizia onde um pacote termina e o
 * outro começa. O rótulo alimenta o `groupBy` nativo da SVAR.
 */
describe('buildGroupLabels', () => {
  const NODES = [
    { id: 'n1', code: '1', title: 'Gestão do Projeto', parentId: null },
    { id: 'n1a', code: '1.1', title: 'Monitoramento', parentId: 'n1' },
    { id: 'n2', code: '2', title: 'Matéria-Prima', parentId: null },
    { id: 'n2a', code: '2.1', title: 'Caracterização', parentId: 'n2' },
    { id: 'n2a1', code: '2.1.1', title: 'Umidade', parentId: 'n2a' },
  ] as unknown as WbsNodeDto[];

  it('should label a task with its level-1 package, not its own node', () => {
    const labels = buildGroupLabels(
      [makeTask({ id: 't1', wbsNode: { id: 'n2a', code: '2.1', title: 'Caracterização' } } as Partial<TaskDto>)],
      NODES,
    );

    expect(labels.get('t1')).toBe('2. Matéria-Prima');
  });

  // Três níveis abaixo da raiz continua pertencendo ao mesmo entregável.
  it('should climb the whole tree to reach the root package', () => {
    const labels = buildGroupLabels(
      [makeTask({ id: 't1', wbsNode: { id: 'n2a1', code: '2.1.1', title: 'Umidade' } } as Partial<TaskDto>)],
      NODES,
    );

    expect(labels.get('t1')).toBe('2. Matéria-Prima');
  });

  it('should label a task already at level 1 with itself', () => {
    const labels = buildGroupLabels(
      [makeTask({ id: 't1', wbsNode: { id: 'n1', code: '1', title: 'Gestão do Projeto' } } as Partial<TaskDto>)],
      NODES,
    );

    expect(labels.get('t1')).toBe('1. Gestão do Projeto');
  });

  it('should bucket a task without a package', () => {
    const labels = buildGroupLabels([makeTask({ id: 't1', wbsNode: null } as Partial<TaskDto>)], NODES);

    expect(labels.get('t1')).toBe(UNGROUPED_LABEL);
  });

  it('should put the group on the gantt row so groupBy can read it', () => {
    const labels = buildGroupLabels(
      [makeTask({ id: 't1', wbsNode: { id: 'n2', code: '2', title: 'Matéria-Prima' } } as Partial<TaskDto>)],
      NODES,
    );
    const [row] = buildGanttTasks(
      [makeTask({ id: 't1', wbsNode: { id: 'n2', code: '2', title: 'Matéria-Prima' } } as Partial<TaskDto>)],
      [],
      labels,
    );

    expect(row.group).toBe('2. Matéria-Prima');
  });

  // Marco não é tarefa e não pertence a pacote — inventar um grupo para ele
  // criaria uma linha de EAP que não existe na EAP.
  it('should keep milestones out of the packages', () => {
    const rows = buildGanttTasks([], [
      { id: 'm1', title: 'Entrega parcial', date: '2026-09-01T00:00:00.000Z', reached: false },
    ] as unknown as MilestoneDto[]);

    expect(rows[0].group).toBe(UNGROUPED_LABEL);
  });
});

describe('fmtProgress', () => {
  // "Quase cheia" não distingue 80% de 95%, e é essa diferença que decide se a
  // atividade fecha na semana.
  it('should render the percentage of a bar', () => {
    expect(fmtProgress(50)).toBe('50%');
  });

  it('should round to a whole percent', () => {
    expect(fmtProgress(66.6)).toBe('67%');
  });

  // Linha de grupo não tem progresso próprio.
  it('should stay empty for a row without progress', () => {
    expect(fmtProgress(undefined)).toBe('');
    expect(fmtProgress(null)).toBe('');
  });

  it('should print zero rather than an empty cell', () => {
    expect(fmtProgress(0)).toBe('0%');
  });
});

describe('zoomConfig', () => {
  // O padrão era o zoom livre da SVAR: um projeto de 2 anos abria em escala de
  // dia e exigia rolagem para enxergar qualquer coisa.
  it('should start on the month level', () => {
    expect(ZOOM_LEVELS[zoomConfig.level].id).toBe('month');
  });

  it('should offer one scale level per control option', () => {
    expect(zoomConfig.levels).toHaveLength(ZOOM_LEVELS.length);
  });
});
