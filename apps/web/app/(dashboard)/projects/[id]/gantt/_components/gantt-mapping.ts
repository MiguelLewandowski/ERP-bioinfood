// Mapeamento puro entre os DTOs do ERP e o formato da SVAR Gantt.
// Sem React/efeitos colaterais — apenas transformação de dados e config visual.

import {
  checklistProgress,
  type TaskDto,
  type MilestoneDto,
  type TaskStatus,
  type SystemRole,
  type TaskDependencyType,
} from '@bioinfood/shared';

export const EDITABLE_ROLES: SystemRole[] = ['ADMIN', 'PADRAO'];
export const BASELINE_ROLES: SystemRole[] = ['ADMIN', 'PADRAO'];

export const isMilestoneId = (id: unknown) => String(id).startsWith('ms-');
export const stripMs = (id: unknown) => String(id).slice(3);

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

// Mostra hora na coluna só quando a tarefa tem um horário definido (ver
// toTimeInput em task-form-dialog.tsx — '00:00' é o sentinel de "sem hora").
const fmtCol = (d?: Date | string) => {
  if (!d) return '';
  const date = new Date(d);
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + (hasTime ? ` ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '');
};

// Escalas localizadas (mês + dia). Com zoom, ajustam automaticamente.
export const scales = [
  { unit: 'month', step: 1, format: (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) },
  { unit: 'day', step: 1, format: (d: Date) => String(d.getDate()) },
];

// Colunas da grade (localizadas) com início, término, duração e responsável.
// `template` recebe (valor-da-célula, linha, coluna) — não a linha inteira.
export const columns = [
  { id: 'text', header: 'Tarefa', flexgrow: 2, width: 220 },
  { id: 'start', header: 'Início', align: 'center' as const, width: 108, template: (v: any) => fmtCol(v) },
  { id: 'end', header: 'Término', align: 'center' as const, width: 108, template: (v: any) => fmtCol(v) },
  { id: 'duration', header: 'Duração', align: 'center' as const, width: 76, template: (v: any) => (v ? `${v}d` : '') },
  { id: 'assignee', header: 'Responsável', align: 'center' as const, width: 120, template: (v: any) => v || '—' },
];

export interface GanttTask {
  id: string;
  text: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'task' | 'milestone' | 'summary';
  parent: string | number;
  open?: boolean;
  assignee: string;
  css: string;
  base_start?: Date;
  base_end?: Date;
}

export function buildGanttTasks(tasks: TaskDto[], milestones: MilestoneDto[]): GanttTask[] {
  const visible = tasks.filter((t) => !t.deletedAt && t.startDate && t.dueDate);
  // Tarefas que são pai de outra → renderizadas como resumo (summary) com expansor.
  const parents = new Set(visible.map((t) => t.parentId).filter(Boolean) as string[]);

  const taskItems: GanttTask[] = visible.map((t) => {
    const start = new Date(t.startDate!);
    const end = new Date(t.dueDate!);
    const hasChildren = parents.has(t.id);
    return {
      id: t.id,
      text: t.title,
      start,
      // Término REAL, sem normalizar. Tarefa de duração zero teria barra de
      // largura 0 — isso é resolvido no CSS (`min-width` em gantt-status.css),
      // não empurrando a data. O valor que entra aqui vai para a store da SVAR
      // e é o que o `update-task` grava de volta: normalização de exibição não
      // pode virar dado. Ver docs/incidentes/timezone-cronograma.md §2.4(a).
      end,
      progress: taskProgress(t),
      type: hasChildren ? 'summary' : 'task',
      // Só referencia o pai se ele estiver visível (com datas); senão fica na raiz.
      parent: t.parentId && visible.some((p) => p.id === t.parentId) ? t.parentId : 0,
      // `open` só pode ser true em nós com filhos (summary) — a SVAR percorre
      // `data.forEach` de qualquer nó aberto, e tarefas-folha não têm `data`.
      ...(hasChildren ? { open: true } : {}),
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

// Formato de link nativo da SVAR (@svar-ui/gantt-store): e2s=FS, s2s=SS, e2e=FF, s2e=SF.
export type SvarLinkType = 'e2s' | 's2s' | 'e2e' | 's2e';

const PMBOK_TO_SVAR: Record<TaskDependencyType, SvarLinkType> = {
  FS: 'e2s',
  SS: 's2s',
  FF: 'e2e',
  SF: 's2e',
};

const SVAR_TO_PMBOK: Record<SvarLinkType, TaskDependencyType> = {
  e2s: 'FS',
  s2s: 'SS',
  e2e: 'FF',
  s2e: 'SF',
};

export function toSvarLinkType(type: TaskDependencyType | undefined): SvarLinkType {
  return type ? PMBOK_TO_SVAR[type] : 'e2s';
}

export function toPmbokDependencyType(type: unknown): TaskDependencyType {
  return SVAR_TO_PMBOK[type as SvarLinkType] ?? 'FS';
}

export interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: SvarLinkType;
  lag?: number;
}

// `visibleIds`: ids das tarefas presentes no Gantt. Links cujo predecessor OU
// sucessor não está visível (ex.: sem datas) são descartados — uma referência
// quebrada faz a SVAR estourar ("Cannot read properties of null").
export function buildGanttLinks(tasks: TaskDto[], visibleIds: Set<string>): GanttLink[] {
  return tasks.flatMap((t) =>
    (t.predecessors ?? [])
      .filter((p) => visibleIds.has(t.id) && visibleIds.has(p.predecessorId))
      .map((p) => ({
        id: p.id,
        source: p.predecessorId,
        target: t.id,
        type: toSvarLinkType(p.type),
        lag: p.lag,
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
