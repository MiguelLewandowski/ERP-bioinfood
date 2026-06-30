// Mapeamento puro entre os DTOs do ERP e o formato da SVAR Gantt.
// Sem React/efeitos colaterais — apenas transformação de dados e config visual.

import {
  checklistProgress,
  type TaskDto,
  type MilestoneDto,
  type TaskStatus,
  type SystemRole,
} from '@bioinfood/shared';

export const EDITABLE_ROLES: SystemRole[] = ['ADMIN', 'APROVA', 'INSERE'];
export const BASELINE_ROLES: SystemRole[] = ['ADMIN', 'APROVA'];

export const isMilestoneId = (id: unknown) => String(id).startsWith('ms-');
export const stripMs = (id: unknown) => String(id).slice(3);

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function taskProgress(t: TaskDto): number {
  if (t.checklist?.length > 0) return checklistProgress(t.checklist);
  return t.status === 'DONE' ? 100 : t.status === 'IN_PROGRESS' ? 50 : 0;
}

export function progressToStatus(progress: number): TaskStatus {
  if (progress >= 100) return 'DONE';
  if (progress <= 0) return 'TODO';
  return 'IN_PROGRESS';
}

export function statusToCss(status: TaskStatus): string {
  return status === 'DONE' ? 'gt-done' : status === 'IN_PROGRESS' ? 'gt-doing' : 'gt-todo';
}

const fmtCol = (d?: Date | string) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

// Escalas localizadas (mês + dia). Com zoom, ajustam automaticamente.
export const scales = [
  { unit: 'month', step: 1, format: (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) },
  { unit: 'day', step: 1, format: (d: Date) => String(d.getDate()) },
];

// Colunas da grade (localizadas) com responsável.
export const columns = [
  { id: 'text', header: 'Tarefa', flexgrow: 2, width: 200 },
  { id: 'start', header: 'Início', align: 'center' as const, width: 86, template: (t: any) => fmtCol(t.start) },
  { id: 'assignee', header: 'Responsável', align: 'center' as const, width: 120, template: (t: any) => t.assignee || '—' },
];

export interface GanttTask {
  id: string;
  text: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'task' | 'milestone';
  parent: number;
  assignee: string;
  css: string;
  base_start?: Date;
  base_end?: Date;
}

export function buildGanttTasks(tasks: TaskDto[], milestones: MilestoneDto[]): GanttTask[] {
  const taskItems: GanttTask[] = tasks
    .filter((t) => !t.deletedAt && t.startDate && t.dueDate)
    .map((t) => {
      const start = new Date(t.startDate!);
      const end = new Date(t.dueDate!);
      return {
        id: t.id,
        text: t.title,
        start,
        end: end <= start ? addDays(start, 1) : end,
        progress: taskProgress(t),
        type: 'task',
        parent: 0,
        assignee: t.assignee?.name ?? '',
        css: statusToCss(t.status),
        // Linha de base (PMBOK): barra-fantasma do planejado aprovado.
        base_start: t.baselineStart ? new Date(t.baselineStart) : undefined,
        base_end: t.baselineEnd ? new Date(t.baselineEnd) : undefined,
      };
    });

  const msItems: GanttTask[] = milestones.map((m) => ({
    id: `ms-${m.id}`,
    text: m.title,
    start: new Date(m.date),
    end: new Date(m.date),
    progress: m.reached ? 100 : 0,
    type: 'milestone',
    parent: 0,
    assignee: '',
    css: 'gt-milestone',
  }));

  return [...taskItems, ...msItems];
}

export interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: 'e2s';
}

export function buildGanttLinks(tasks: TaskDto[]): GanttLink[] {
  return tasks.flatMap((t) =>
    (t.predecessors ?? []).map((p) => ({
      id: p.id,
      source: p.predecessorId,
      target: t.id,
      type: 'e2s' as const,
    })),
  );
}

export interface GanttMarker { start: Date; text: string; css?: string }

// Marcadores: hoje, término planejado e término estimado (maior prazo).
export function buildMarkers(projectEnd: string | null, ganttTasks: GanttTask[]): GanttMarker[] {
  const items: GanttMarker[] = [{ start: new Date(), text: 'Hoje' }];
  if (projectEnd) items.push({ start: new Date(projectEnd), text: 'Término planejado' });
  const ends = ganttTasks.map((t) => t.end.getTime());
  if (ends.length) items.push({ start: new Date(Math.max(...ends)), text: 'Término estimado' });
  return items;
}
