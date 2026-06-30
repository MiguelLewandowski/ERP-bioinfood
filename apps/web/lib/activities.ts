import { parseISO, isWithinInterval, format } from 'date-fns';
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
