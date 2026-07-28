import { describe, it, expect } from 'vitest';
import type { MilestoneDto, TaskDto } from '@bioinfood/shared';
import { buildGanttTasks, fmtDuration } from './gantt-mapping';

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
