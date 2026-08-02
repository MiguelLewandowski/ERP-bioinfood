import type { CrmActivityDto, CrmActivityType } from '@bioinfood/shared';

// Vocabulário único de urgência das tarefas de CRM. Antes isto vivia copiado em
// crm-card.tsx e opportunity-tasks-section.tsx — o comentário de um deles até
// dizia "mesmo vocabulário da aba Tarefas", ou seja, copy-paste como contrato.
// Toda tela de tarefa de CRM importa daqui.

export const ACTIVITY_TYPE_LABELS: Record<CrmActivityType, string> = {
  NOTE: 'Nota',
  EMAIL: 'E-mail',
  CALL: 'Ligação',
  WHATSAPP: 'WhatsApp',
  PROPOSAL: 'Proposta',
  MEETING: 'Reunião',
  VISIT: 'Visita',
  OTHER: 'Outro',
};

/** Data de hoje em ISO curto (yyyy-mm-dd), no fuso local. */
function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate.slice(0, 10) < todayIso();
}

export function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate.slice(0, 10) === todayIso();
}

/** Dias corridos entre hoje e o prazo (negativo = atrasada). */
export function daysUntilDue(dueDate: string): number {
  const due = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
  const today = new Date(`${todayIso()}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export type TaskBucket = 'overdue' | 'today' | 'week' | 'later' | 'noDate' | 'done';

export const BUCKET_LABELS: Record<TaskBucket, string> = {
  overdue: 'Atrasadas',
  today: 'Hoje',
  week: 'Próximos 7 dias',
  later: 'Mais tarde',
  noDate: 'Sem prazo',
  done: 'Concluídas',
};

export function bucketOf(task: CrmActivityDto): TaskBucket {
  if (task.status === 'DONE' || task.status === 'CANCELLED') return 'done';
  if (!task.dueDate) return 'noDate';
  if (isOverdue(task.dueDate)) return 'overdue';
  if (isDueToday(task.dueDate)) return 'today';
  return daysUntilDue(task.dueDate) <= 7 ? 'week' : 'later';
}

/**
 * Rótulo humano do prazo — o usuário nunca deve precisar calcular de cabeça se
 * uma data está atrasada. "há 3 dias" / "Hoje" / "Amanhã" / "qui, 24 jul".
 */
export function formatDueLabel(dueDate: string | null): string {
  if (!dueDate) return 'Sem prazo';
  const diff = daysUntilDue(dueDate);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  if (diff < 0) return `há ${Math.abs(diff)} dias`;
  if (diff <= 7) return `em ${diff} dias`;
  return new Date(`${dueDate.slice(0, 10)}T00:00:00`)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/**
 * Prazo para exibição: rótulo relativo (urgência num relance) e a data exata
 * como apoio. `exact` vem null quando o próprio rótulo já é uma data, para não
 * repetir a mesma informação em duas linhas.
 */
export function dueDisplay(dueDate: string | null): { label: string; exact: string | null } {
  const label = formatDueLabel(dueDate);
  if (!dueDate) return { label, exact: null };
  const isRelative = daysUntilDue(dueDate) <= 7;
  return {
    label,
    exact: isRelative
      ? new Date(`${dueDate.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR')
      : null,
  };
}

export type OpportunityTaskState = 'overdue' | 'today' | 'upcoming' | 'none';

export interface OpportunityTaskSummary {
  state: OpportunityTaskState;
  /** Quantidade de tarefas pendentes (não conta concluídas). */
  pending: number;
}

/**
 * Estado das tarefas de um negócio para o indicador do card no funil: o
 * usuário precisa distinguir "sem próximo passo" de "tem tarefa, mas só na
 * semana que vem" sem abrir o negócio.
 */
export function summarizeOpportunityTasks(tasks: CrmActivityDto[]): OpportunityTaskSummary {
  const pending = tasks.filter((t) => bucketOf(t) !== 'done');
  if (pending.length === 0) return { state: 'none', pending: 0 };
  const buckets = new Set(pending.map(bucketOf));
  const state: OpportunityTaskState = buckets.has('overdue')
    ? 'overdue'
    : buckets.has('today')
      ? 'today'
      : 'upcoming';
  return { state, pending: pending.length };
}

const BUCKET_ORDER: Record<TaskBucket, number> = {
  overdue: 0, today: 1, week: 2, later: 3, noDate: 4, done: 5,
};

/** Mais urgente primeiro; concluídas sempre no fim. */
export function sortByUrgency(a: CrmActivityDto, b: CrmActivityDto): number {
  const byBucket = BUCKET_ORDER[bucketOf(a)] - BUCKET_ORDER[bucketOf(b)];
  if (byBucket !== 0) return byBucket;
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate < b.dueDate ? -1 : 1;
}

/**
 * Agrupa por dia para a visão Agenda — inclui concluídas, que ali servem de
 * registro do que já foi feito. Tarefas sem prazo caem num grupo no fim.
 */
export function groupByDay(
  tasks: CrmActivityDto[],
): Array<{ key: string; date: Date | null; label: string; tasks: CrmActivityDto[] }> {
  const map = new Map<string, CrmActivityDto[]>();
  for (const task of tasks) {
    const key = task.dueDate?.slice(0, 10) ?? '';
    const list = map.get(key);
    if (list) list.push(task);
    else map.set(key, [task]);
  }

  const dated = [...map.entries()]
    .filter(([key]) => key !== '')
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, items]) => {
      const date = new Date(`${key}T00:00:00`);
      const relative = formatDueLabel(key);
      const full = date.toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long',
      });
      // "Hoje · segunda-feira, 21 de julho" — âncora relativa + data completa.
      const label = ['Hoje', 'Amanhã', 'Ontem'].includes(relative)
        ? `${relative} · ${full}`
        : full;
      return { key, date, label, tasks: items.sort(sortByUrgency) };
    });

  const undated = map.get('');
  return undated
    ? [...dated, { key: 'sem-prazo', date: null, label: 'Sem prazo', tasks: undated.sort(sortByUrgency) }]
    : dated;
}

/** Agrupa em baldes na ordem de urgência, omitindo os vazios. */
export function groupByBucket(
  tasks: CrmActivityDto[],
): Array<{ bucket: TaskBucket; tasks: CrmActivityDto[] }> {
  const map = new Map<TaskBucket, CrmActivityDto[]>();
  for (const task of tasks) {
    const bucket = bucketOf(task);
    const list = map.get(bucket);
    if (list) list.push(task);
    else map.set(bucket, [task]);
  }
  return (Object.keys(BUCKET_ORDER) as TaskBucket[])
    .filter((bucket) => map.has(bucket))
    .map((bucket) => ({
      bucket,
      tasks: map.get(bucket)!.sort(sortByUrgency),
    }));
}
