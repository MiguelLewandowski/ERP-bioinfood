import {
  parseISO, isWithinInterval, format,
  startOfDay, startOfMonth, startOfWeek, addDays, max as maxDate, min as minDate,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { taskAnchorDate } from '@bioinfood/shared';
import type { ActivityDto, TaskStatus, TaskPriority } from '@bioinfood/shared';

// Data-âncora da atividade (regra única em @bioinfood/shared), já parseada.
export function anchorDate(activity: Pick<ActivityDto, 'startDate' | 'dueDate'>): Date | null {
  const raw = taskAnchorDate(activity);
  return raw ? parseISO(raw) : null;
}

export interface DayBlock {
  key: string; // yyyy-MM-dd
  date: Date;
  activities: ActivityDto[];
}

// Agrupa atividades por dia (dentro do intervalo), ordenando os blocos por data.
export function groupByDay(
  activities: ActivityDto[],
  interval: { start: Date; end: Date },
): DayBlock[] {
  const blocks = new Map<string, DayBlock>();

  for (const activity of activities) {
    const date = anchorDate(activity);
    if (!date || !isWithinInterval(date, interval)) continue;
    const key = format(date, 'yyyy-MM-dd');
    if (!blocks.has(key)) blocks.set(key, { key, date, activities: [] });
    blocks.get(key)!.activities.push(activity);
  }

  return Array.from(blocks.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function formatDayLabel(date: Date): string {
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

export function formatTime(activity: Pick<ActivityDto, 'startDate' | 'dueDate'>): string | null {
  const raw = taskAnchorDate(activity);
  if (!raw) return null;
  const date = parseISO(raw);
  const time = format(date, 'HH:mm');
  return time === '00:00' ? null : time;
}

// ————————————————————————————————————————————————————————————
// Calendário mensal (visão em grade estilo Notion)
// ————————————————————————————————————————————————————————————

// Intervalo efetivo (só-data) da atividade para posicionar a barra no mês.
// start = startDate ?? dueDate; end = dueDate ?? startDate; nunca end < start.
export function effectiveInterval(
  activity: Pick<ActivityDto, 'startDate' | 'dueDate'>,
): { start: Date; end: Date } | null {
  const rawStart = activity.startDate ?? activity.dueDate;
  const rawEnd = activity.dueDate ?? activity.startDate;
  if (!rawStart || !rawEnd) return null;
  const start = startOfDay(parseISO(rawStart));
  const end = startOfDay(parseISO(rawEnd));
  return { start, end: end < start ? start : end };
}

// Grade de 6 semanas × 7 dias, começando na segunda-feira da semana que
// contém o dia 1 do mês do `cursor` (dias vizinhos preenchem as bordas).
export function buildMonthGrid(cursor: Date): Date[][] {
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const days: Date[] = [];
    for (let d = 0; d < 7; d++) days.push(addDays(gridStart, w * 7 + d));
    weeks.push(days);
  }
  return weeks;
}

export interface WeekBar {
  activity: ActivityDto;
  colStart: number; // 0..6 (índice da coluna na semana)
  span: number;     // 1..7
  lane: number;     // trilha vertical (0 = topo)
}

// Recorta cada atividade que sobrepõe a semana às bordas dela e atribui a
// menor trilha (lane) livre — barras que cruzam a virada de semana viram um
// segmento por linha (comportamento Notion).
export function layoutWeekBars(weekDays: Date[], activities: ActivityDto[]): WeekBar[] {
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const segments = activities
    .map((activity) => {
      const interval = effectiveInterval(activity);
      if (!interval) return null;
      if (interval.end < weekStart || interval.start > weekEnd) return null;
      const clampedStart = maxDate([interval.start, weekStart]);
      const clampedEnd = minDate([interval.end, weekEnd]);
      const colStart = Math.round(
        (clampedStart.getTime() - weekStart.getTime()) / 86_400_000,
      );
      const colEnd = Math.round(
        (clampedEnd.getTime() - weekStart.getTime()) / 86_400_000,
      );
      return { activity, colStart, span: colEnd - colStart + 1, start: interval.start };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    // Ordena por início real e depois por duração (barras mais longas primeiro).
    .sort((a, b) => a.start.getTime() - b.start.getTime() || b.span - a.span);

  const lanes: number[] = []; // lanes[l] = próxima coluna livre na trilha l
  return segments.map(({ activity, colStart, span }) => {
    let lane = lanes.findIndex((nextFree) => nextFree <= colStart);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(0);
    }
    lanes[lane] = colStart + span;
    return { activity, colStart, span, lane };
  });
}

export const STATUS_META: Record<TaskStatus, { label: string; bg: string; color: string }> = {
  TODO:        { label: 'A fazer',     bg: '#F0F0F0', color: '#575756' },
  IN_PROGRESS: { label: 'Em andamento', bg: '#FCEBD2', color: '#C16C06' },
  DONE:        { label: 'Concluída',   bg: '#DCEFD6', color: '#156D1D' },
};

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  LOW:      { label: 'Baixa',    color: '#878787' },
  MEDIUM:   { label: 'Média',    color: '#46AD48' },
  HIGH:     { label: 'Alta',     color: '#DD8005' },
  CRITICAL: { label: 'Crítica',  color: '#D64550' },
};

// Cor de destaque para atividades atrasadas (mesma escala de "crítico").
export const OVERDUE_COLOR = '#D64550';

// ————————————————————————————————————————————————————————————
// Atraso, filtros e resumo
// ————————————————————————————————————————————————————————————

// Atrasada: data-âncora anterior a hoje e ainda não concluída.
export function isOverdue(activity: Pick<ActivityDto, 'startDate' | 'dueDate' | 'status'>): boolean {
  if (activity.status === 'DONE') return false;
  const date = anchorDate(activity);
  if (!date) return false;
  return startOfDay(date) < startOfDay(new Date());
}

export interface ActivityFilters {
  projectId: string;   // '' = todos
  assigneeId: string;  // '' = todos ('__none__' = sem responsável)
  status: TaskStatus | '';
  priority: TaskPriority | '';
  mine: boolean;       // só atividades do usuário atual
  currentUserId: string;
}

export const EMPTY_FILTERS: Omit<ActivityFilters, 'currentUserId'> = {
  projectId: '', assigneeId: '', status: '', priority: '', mine: false,
};

export function filterActivities(activities: ActivityDto[], f: ActivityFilters): ActivityDto[] {
  return activities.filter((a) => {
    if (f.projectId && a.project.id !== f.projectId) return false;
    if (f.assigneeId === '__none__' && a.assignee) return false;
    if (f.assigneeId && f.assigneeId !== '__none__' && a.assignee?.id !== f.assigneeId) return false;
    if (f.status && a.status !== f.status) return false;
    if (f.priority && a.priority !== f.priority) return false;
    if (f.mine && a.assignee?.id !== f.currentUserId) return false;
    return true;
  });
}

export interface ActivitySummary {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

export function summarize(activities: ActivityDto[]): ActivitySummary {
  return activities.reduce<ActivitySummary>(
    (acc, a) => {
      acc.total += 1;
      if (a.status === 'TODO') acc.todo += 1;
      else if (a.status === 'IN_PROGRESS') acc.inProgress += 1;
      else if (a.status === 'DONE') acc.done += 1;
      if (isOverdue(a)) acc.overdue += 1;
      return acc;
    },
    { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 },
  );
}

// Opções distintas (projeto/responsável) derivadas das atividades carregadas.
export function distinctProjects(activities: ActivityDto[]): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const a of activities) map.set(a.project.id, a.project.name);
  return Array.from(map, ([id, name]) => ({ id, name })).sort((x, y) => x.name.localeCompare(y.name));
}

export function distinctAssignees(activities: ActivityDto[]): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const a of activities) if (a.assignee) map.set(a.assignee.id, a.assignee.name);
  return Array.from(map, ([id, name]) => ({ id, name })).sort((x, y) => x.name.localeCompare(y.name));
}
