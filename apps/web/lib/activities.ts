import {
  parseISO, format,
  startOfDay, startOfMonth, startOfWeek, addDays, max as maxDate, min as minDate,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { taskAnchorDate } from '@bioinfood/shared';
import type { ActivityDto, TaskStatus, TaskPriority } from '@bioinfood/shared';
import { parseCalendarDate, hasTimeComponent } from './dates';

/**
 * Data-âncora da atividade (regra única em `@bioinfood/shared`), já parseada.
 *
 * ⚠️ `Task.startDate`/`dueDate` são **dia de calendário**, não instante — estão
 * nominalmente na tabela da seção "Datas" do CLAUDE.md. A API os devolve como
 * meia-noite **UTC**; `parseISO` os lia em hora local e, em `America/Sao_Paulo`,
 * meia-noite UTC do dia 02 virava 21:00 do dia **01**.
 *
 * O efeito era visível na tela: uma atividade de 02/08 a 21/08 aparecia como
 * "01 de ago, 21:00 — 20 de ago, 21:00" no detalhe, e caía no bloco do dia
 * errado na lista. Ver docs/incidentes/timezone-cronograma.md e o achado A2 de
 * docs/analise-uiux-atividades.md.
 *
 * Atividade COM hora de verdade (uma reunião às 14h) continua sendo lida como
 * instante — daí o `hasTimeComponent` em vez de converter tudo.
 */
export function anchorDate(activity: Pick<ActivityDto, 'startDate' | 'dueDate'>): Date | null {
  const raw = taskAnchorDate(activity);
  if (!raw) return null;
  return hasTimeComponent(raw) ? parseISO(raw) : parseCalendarDate(raw);
}

export interface DayBlock {
  key: string; // yyyy-MM-dd
  date: Date;
  /** Vence neste dia — é o que exige ação. */
  due: ActivityDto[];
  /** Já começou e ainda não vence — contexto, mostrado recolhido. */
  ongoing: ActivityDto[];
}

/**
 * Agrupa atividades por dia dentro do intervalo.
 *
 * ## O defeito que isto corrige
 *
 * A versão anterior agrupava pela **data-âncora** (`startDate ?? dueDate`) e
 * descartava tudo que caísse fora do intervalo. Consequência medida na semana
 * 27/07–02/08 do banco de demonstração: o resumo dizia "6 Total" e a lista
 * mostrava **uma** atividade. As outras cinco tinham começado antes de segunda
 * — e **quatro delas venciam naquela mesma semana**.
 *
 * Ou seja: a visão onde se planeja a semana escondia os prazos da semana. A
 * visão Mês nunca teve o problema, porque usa `effectiveInterval`.
 *
 * ## Como funciona agora
 *
 * A atividade entra em todo dia coberto pelo seu período, separada em dois
 * baldes por dia: `due` (vence hoje) e `ongoing` (em andamento). A separação
 * evita o efeito colateral óbvio de simplesmente listar tudo em todo dia — uma
 * tarefa de cinco semanas apareceria 35 vezes com o mesmo peso da que vence
 * hoje, e o ruído substituiria um problema por outro.
 */
export function groupByDay(
  activities: ActivityDto[],
  interval: { start: Date; end: Date },
): DayBlock[] {
  const blocks = new Map<string, DayBlock>();

  const dayStart = startOfDay(interval.start);
  const dayEnd = startOfDay(interval.end);
  for (let d = dayStart; d <= dayEnd; d = addDays(d, 1)) {
    const key = format(d, 'yyyy-MM-dd');
    blocks.set(key, { key, date: d, due: [], ongoing: [] });
  }

  for (const activity of activities) {
    const iv = effectiveInterval(activity);
    if (!iv) continue;
    const from = maxDate([iv.start, dayStart]);
    const to = minDate([iv.end, dayEnd]);
    if (to < from) continue;

    for (let d = from; d <= to; d = addDays(d, 1)) {
      const block = blocks.get(format(d, 'yyyy-MM-dd'));
      if (!block) continue;
      // "Vence" é o último dia do período — o dia acionável.
      if (d.getTime() === iv.end.getTime()) block.due.push(activity);
      else block.ongoing.push(activity);
    }
  }

  return Array.from(blocks.values())
    .filter((b) => b.due.length > 0 || b.ongoing.length > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function formatDayLabel(date: Date): string {
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

/**
 * Horário da atividade — `null` quando ela é de dia inteiro.
 *
 * A checagem é `hasTimeComponent` (componentes **UTC**), não `HH:mm !== '00:00'`
 * em hora local. Um dia puro é `00:00:00.000Z`, que em `America/Sao_Paulo` vira
 * 21:00 — a comparação antiga concluía "tem horário marcado" e exibia um 21:00
 * que não existe em lugar nenhum, em toda atividade sem hora.
 */
export function formatTime(activity: Pick<ActivityDto, 'startDate' | 'dueDate'>): string | null {
  const raw = taskAnchorDate(activity);
  if (!raw || !hasTimeComponent(raw)) return null;
  return format(parseISO(raw), 'HH:mm');
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
  // Mesmo cuidado de `anchorDate`: dia puro não pode passar por `parseISO`,
  // senão a barra do calendário começa e termina um dia antes.
  const parse = (raw: string) =>
    startOfDay(hasTimeComponent(raw) ? parseISO(raw) : parseCalendarDate(raw));
  const start = parse(rawStart);
  const end = parse(rawEnd);
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

/**
 * Cores desta tela — **só token semântico**, nunca hex.
 *
 * Este arquivo guardava 11 hex crus, consumidos por `style={{}}` nos
 * componentes. O ESLint não acusava porque a regra mira `className` em JSX, e
 * estes atravessavam por um `.ts` de lib. O `design-tokens.md` abre proibindo
 * exatamente isso.
 *
 * Não era só higiene: `CRITICAL` era `#D64550`, que **não é** o token
 * `destructive`. A mesma tarefa crítica tinha um vermelho aqui e outro no
 * `PriorityBadge` do Kanban — a unificação da escala de prioridade registrada
 * como resolvida em docs/analise-uiux.md nunca alcançou este arquivo.
 */
export const STATUS_META: Record<TaskStatus, { label: string; bg: string; color: string }> = {
  TODO:        { label: 'A fazer',      bg: 'hsl(var(--muted))',        color: 'hsl(var(--muted-foreground))' },
  IN_PROGRESS: { label: 'Em andamento', bg: 'hsl(var(--accent) / 0.15)', color: 'hsl(var(--accent))' },
  DONE:        { label: 'Concluída',    bg: 'hsl(var(--success) / 0.2)', color: 'hsl(var(--primary-dark))' },
};

// Mesma escala do `PriorityBadge` (LOW→neutro, MEDIUM→success, HIGH→accent,
// CRITICAL→destructive). Mudou lá, muda aqui.
export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  LOW:      { label: 'Baixa',   color: 'hsl(var(--muted-foreground))' },
  MEDIUM:   { label: 'Média',   color: 'hsl(var(--success))' },
  HIGH:     { label: 'Alta',    color: 'hsl(var(--accent))' },
  CRITICAL: { label: 'Crítica', color: 'hsl(var(--destructive))' },
};

/** Atraso usa a mesma cor de "crítico" — agora o token, não um vermelho vizinho. */
export const OVERDUE_COLOR = 'hsl(var(--destructive))';

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
  /** Só as atrasadas — ligado pelo chip "Atrasadas" do resumo. */
  onlyOverdue: boolean;
  currentUserId: string;
}

export const EMPTY_FILTERS: Omit<ActivityFilters, 'currentUserId'> = {
  projectId: '', assigneeId: '', status: '', priority: '', mine: false, onlyOverdue: false,
};

export function filterActivities(activities: ActivityDto[], f: ActivityFilters): ActivityDto[] {
  return activities.filter((a) => {
    if (f.projectId && a.project.id !== f.projectId) return false;
    if (f.assigneeId === '__none__' && a.assignee) return false;
    if (f.assigneeId && f.assigneeId !== '__none__' && a.assignee?.id !== f.assigneeId) return false;
    if (f.status && a.status !== f.status) return false;
    if (f.priority && a.priority !== f.priority) return false;
    if (f.mine && a.assignee?.id !== f.currentUserId) return false;
    if (f.onlyOverdue && !isOverdue(a)) return false;
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
