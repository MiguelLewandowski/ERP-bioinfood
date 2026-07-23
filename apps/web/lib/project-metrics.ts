// Agregados da aba Dashboard do projeto. Funções puras — recebem os DTOs que a
// página já buscou e devolvem só números e recortes. Nenhuma chamada de API aqui:
// isso mantém a regra testável sem mockar rede e evita duplicar cálculo na UI.

import type { MilestoneDto, ProjectDto, RiskDto, StakeholderDto, TaskDto } from '@bioinfood/shared';
import { parseCalendarDate } from './dates';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dia de calendário ('YYYY-MM-DD') de um campo de data da API. */
function day(value: string | null): string | null {
  return value ? value.slice(0, 10) : null;
}

// ── Tarefas ───────────────────────────────────────────────────────────────────

export interface AssigneeLoad {
  id: string;
  name: string;
  total: number;
  done: number;
}

export interface TaskMetrics {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  /** Percentual concluído (0–100, inteiro). 0 quando não há tarefas. */
  progress: number;
  /** Não concluídas cujo prazo já passou, da mais atrasada para a menos. */
  overdue: TaskDto[];
  /** Tarefas em aberto sem responsável — trabalho que ninguém puxou. */
  unassigned: number;
  /** Carga por responsável, do mais carregado para o menos. */
  byAssignee: AssigneeLoad[];
}

export function computeTaskMetrics(tasks: TaskDto[], todayIso: string): TaskMetrics {
  const active = tasks.filter((t) => !t.deletedAt);

  const done = active.filter((t) => t.status === 'DONE').length;
  const inProgress = active.filter((t) => t.status === 'IN_PROGRESS').length;
  const todo = active.filter((t) => t.status === 'TODO').length;

  const overdue = active
    .filter((t) => {
      const due = day(t.dueDate);
      return t.status !== 'DONE' && !!due && due < todayIso;
    })
    .sort((a, b) => (day(a.dueDate)! < day(b.dueDate)! ? -1 : 1));

  const loads = new Map<string, AssigneeLoad>();
  for (const task of active) {
    if (!task.assignee) continue;
    const entry = loads.get(task.assignee.id)
      ?? { id: task.assignee.id, name: task.assignee.name, total: 0, done: 0 };
    entry.total += 1;
    if (task.status === 'DONE') entry.done += 1;
    loads.set(task.assignee.id, entry);
  }

  return {
    total: active.length,
    done,
    inProgress,
    todo,
    progress: active.length === 0 ? 0 : Math.round((done / active.length) * 100),
    overdue,
    unassigned: active.filter((t) => !t.assignee && t.status !== 'DONE').length,
    byAssignee: [...loads.values()].sort((a, b) => b.total - a.total),
  };
}

// ── Cronograma ────────────────────────────────────────────────────────────────

export type ScheduleStatus = 'ON_TRACK' | 'AT_RISK' | 'LATE' | 'UNKNOWN';

export interface ScheduleHealth {
  startDate: string | null;
  endDate: string | null;
  forecastEndDate: string | null;
  /** Dias entre o término previsto e o planejado. Positivo = atraso. */
  driftDays: number | null;
  status: ScheduleStatus;
  hasBaseline: boolean;
}

/**
 * Compara o término planejado (`endDate`, fixo) com o previsto
 * (`forecastEndDate`, derivado do maior prazo das tarefas).
 *
 * Faixas: no prazo (≤ 0 dia de desvio) · atenção (1 a 7) · atrasado (> 7).
 * Sem uma das duas datas não há o que comparar — `UNKNOWN`.
 */
export function computeScheduleHealth(
  project: Pick<ProjectDto, 'startDate' | 'endDate' | 'forecastEndDate' | 'baselineSetAt'>,
): ScheduleHealth {
  const endDate = day(project.endDate);
  const forecast = day(project.forecastEndDate);

  let driftDays: number | null = null;
  let status: ScheduleStatus = 'UNKNOWN';

  if (endDate && forecast) {
    const diff = parseCalendarDate(forecast).getTime() - parseCalendarDate(endDate).getTime();
    driftDays = Math.round(diff / DAY_MS);
    status = driftDays <= 0 ? 'ON_TRACK' : driftDays <= 7 ? 'AT_RISK' : 'LATE';
  }

  return {
    startDate: project.startDate,
    endDate: project.endDate,
    forecastEndDate: project.forecastEndDate,
    driftDays,
    status,
    hasBaseline: !!project.baselineSetAt,
  };
}

// ── Riscos ────────────────────────────────────────────────────────────────────

export type RiskBand = 'critical' | 'high' | 'medium' | 'low';

/** Mesmas faixas usadas na aba Riscos — não divergir. */
export function riskBand(score: number): RiskBand {
  if (score >= 16) return 'critical';
  if (score >= 9) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

export interface RiskMetrics {
  total: number;
  critical: number;
  high: number;
  /** Os de maior score primeiro, limitado a `limit`. */
  top: RiskDto[];
}

export function computeRiskMetrics(risks: RiskDto[], limit = 5): RiskMetrics {
  return {
    total: risks.length,
    critical: risks.filter((r) => riskBand(r.score) === 'critical').length,
    high: risks.filter((r) => riskBand(r.score) === 'high').length,
    top: [...risks].sort((a, b) => b.score - a.score).slice(0, limit),
  };
}

// ── Marcos ────────────────────────────────────────────────────────────────────

export interface MilestoneMetrics {
  total: number;
  reached: number;
  /** Não atingidos com data de hoje em diante, do mais próximo ao mais distante. */
  next: MilestoneDto[];
  /** Não atingidos cuja data já passou. */
  overdue: MilestoneDto[];
}

export function computeMilestoneMetrics(
  milestones: MilestoneDto[],
  todayIso: string,
  limit = 4,
): MilestoneMetrics {
  const pending = milestones.filter((m) => !m.reached);
  const byDate = (a: MilestoneDto, b: MilestoneDto) => (day(a.date)! < day(b.date)! ? -1 : 1);

  return {
    total: milestones.length,
    reached: milestones.filter((m) => m.reached).length,
    next: pending.filter((m) => day(m.date)! >= todayIso).sort(byDate).slice(0, limit),
    overdue: pending.filter((m) => day(m.date)! < todayIso).sort(byDate),
  };
}

// ── Equipe ────────────────────────────────────────────────────────────────────

/**
 * Partes interessadas que respondem pelo projeto (patrocinador e responsável),
 * na ordem em que importam numa escalada.
 */
export function keyStakeholders(stakeholders: StakeholderDto[]): StakeholderDto[] {
  const weight: Record<string, number> = { SPONSOR: 0, OWNER: 1 };
  return stakeholders
    .filter((s) => s.type === 'SPONSOR' || s.type === 'OWNER')
    .sort((a, b) => weight[a.type] - weight[b.type]);
}
