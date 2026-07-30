// Mapeamento puro entre os DTOs do ERP e o formato da SVAR Gantt.
// Sem React/efeitos colaterais — apenas transformação de dados e config visual.

import {
  checklistProgress,
  type TaskDto,
  type MilestoneDto,
  type TaskStatus,
  type SystemRole,
  type TaskDependencyType,
  type WbsNodeDto,
} from '@bioinfood/shared';
import { hasTimeComponent, parseCalendarDate } from '@/lib/dates';
import { buildWbsIndex } from '@/lib/project-wbs';

/**
 * Data da API → `Date` para a store da SVAR, preservando hora quando existe.
 *
 * Sem hora, `parseCalendarDate` põe a barra na meia-noite LOCAL do dia certo —
 * `new Date()` cru a jogaria para 21h do dia anterior. Com hora, o instante é a
 * informação, e vai inteiro: a barra começa no meio do dia, como deve.
 */
export function toGanttDate(value: string): Date {
  return hasTimeComponent(value) ? new Date(value) : parseCalendarDate(value);
}

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

// Mostra a hora só quando a tarefa tem hora. As datas na store já vêm no fuso
// certo (`toGanttDate`), então formatar direto acerta nos dois casos.
const fmtCol = (d?: Date | string) => {
  if (!d) return '';
  const date = d instanceof Date ? d : toGanttDate(d);
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  // Na store, ter hora é não estar na meia-noite LOCAL — que é onde
  // `toGanttDate` põe justamente os registros sem hora.
  const withTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return withTime
    ? `${day} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : day;
};

/**
 * Duração em dias para a coluna da grade.
 *
 * Tarefa que começa e termina no mesmo dia tem diferença zero, e zero é falsy —
 * a célula saía vazia. Pela convenção de cronograma, algo que acontece na
 * segunda ocupa **um** dia de trabalho, então o piso é `1d`. É a mesma regra que
 * a store da SVAR aplica internamente (`duration = 1` quando o diff é zero).
 *
 * Só a exibição compensa: o banco continua com `dueDate == startDate`, e a
 * persistência não vê esta função. Ver docs/incidentes/timezone-cronograma.md §2.4(a).
 */
export function fmtDuration(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const days = Number(value);
  if (!Number.isFinite(days)) return '';
  return `${Math.max(1, Math.round(days))}d`;
}

const MONTH_YEAR = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const MONTH_SHORT = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
const QUARTER = (d: Date) => `${Math.floor(d.getMonth() / 3) + 1}º tri ${d.getFullYear()}`;

// Escalas localizadas (mês + dia). Com zoom, ajustam automaticamente.
export const scales = [
  { unit: 'month', step: 1, format: MONTH_YEAR },
  { unit: 'day', step: 1, format: (d: Date) => String(d.getDate()) },
];

/** Níveis do controle Dia/Semana/Mês/Trimestre, na ordem do seletor. */
export const ZOOM_LEVELS = [
  { id: 'day',     label: 'Dia' },
  { id: 'week',    label: 'Semana' },
  { id: 'month',   label: 'Mês' },
  { id: 'quarter', label: 'Trimestre' },
] as const;

export type ZoomLevelId = typeof ZOOM_LEVELS[number]['id'];

/** Índice do nível padrão. Mês: um projeto de 2 anos cabe na tela sem rolar. */
export const DEFAULT_ZOOM_LEVEL: ZoomLevelId = 'month';

// `IZoomConfig` é tipo PÚBLICO da @svar-ui/gantt-store 2.7.1 — nada aqui depende
// de detalhe interno, então a versão continua podendo ficar fixada sem virar
// dívida. A ordem dos níveis é a do array e o `level` indexa nela.
export const zoomConfig = {
  level: ZOOM_LEVELS.findIndex((l) => l.id === DEFAULT_ZOOM_LEVEL),
  levels: [
    {
      minCellWidth: 28, maxCellWidth: 80,
      scales: [
        { unit: 'month', step: 1, format: MONTH_YEAR },
        { unit: 'day', step: 1, format: (d: Date) => String(d.getDate()) },
      ],
    },
    {
      minCellWidth: 40, maxCellWidth: 120,
      scales: [
        { unit: 'month', step: 1, format: MONTH_YEAR },
        { unit: 'week', step: 1, format: (d: Date) => `S${weekOfYear(d)}` },
      ],
    },
    {
      minCellWidth: 60, maxCellWidth: 180,
      scales: [
        { unit: 'year', step: 1, format: (d: Date) => String(d.getFullYear()) },
        { unit: 'month', step: 1, format: MONTH_SHORT },
      ],
    },
    {
      minCellWidth: 80, maxCellWidth: 220,
      scales: [
        { unit: 'year', step: 1, format: (d: Date) => String(d.getFullYear()) },
        { unit: 'quarter', step: 1, format: QUARTER },
      ],
    },
  ],
};

/** Semana ISO — só para o rótulo da escala semanal. */
export function weekOfYear(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // Quinta-feira da semana corrente define o ano ISO.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

// Colunas da grade (localizadas) com início, término, duração e responsável.
// `template` recebe (valor-da-célula, linha, coluna) — não a linha inteira.
//
// `duration` era `width: 76` e o cabeçalho "Duração" saía cortado ("Dura…").
export const columns = [
  { id: 'text', header: 'Tarefa', flexgrow: 2, width: 220 },
  { id: 'start', header: 'Início', align: 'center' as const, width: 108, template: (v: any) => fmtCol(v) },
  { id: 'end', header: 'Término', align: 'center' as const, width: 108, template: (v: any) => fmtCol(v) },
  { id: 'duration', header: 'Duração', align: 'center' as const, width: 96, template: (v: any) => fmtDuration(v) },
  { id: 'progress', header: '%', align: 'center' as const, width: 56, template: (v: any) => fmtProgress(v) },
  { id: 'assignee', header: 'Responsável', align: 'center' as const, width: 120, template: (v: any) => v || '—' },
];

/**
 * Percentual na grade. A barra já desenha o preenchimento, mas "quase cheia" não
 * distingue 80% de 95% — e é essa diferença que decide se a atividade fecha na
 * semana. Linha de grupo não tem progresso próprio e fica vazia.
 */
export function fmtProgress(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const pct = Number(value);
  if (!Number.isFinite(pct)) return '';
  return `${Math.round(pct)}%`;
}

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
  /** Pacote de nível 1 da EAP — campo lido pelo `groupBy` nativo da SVAR. */
  group: string;
}

export const UNGROUPED_LABEL = 'Sem pacote da EAP';
/**
 * Grupo próprio dos marcos.
 *
 * Antes eles caíam em `UNGROUPED_LABEL`, junto das tarefas sem pacote — e como o
 * `groupBy` manda o balde "sem grupo" para o fim, todos os marcos apareciam
 * soltos no rodapé do gráfico, o que lia como defeito. Marco não é "tarefa sem
 * pacote": é outra coisa, e merece uma seção que se identifica.
 */
export const MILESTONE_GROUP_LABEL = 'Marcos';

/**
 * taskId → rótulo do pacote de NÍVEL 1 que contém a tarefa.
 *
 * A ordenação das linhas por `wbsNodeId` sempre esteve certa; o que faltava era
 * dizer onde um pacote termina e o outro começa. Usa o `rootOf` de
 * `lib/project-wbs.ts`, que foi separado do rollup na Onda 1 exatamente para
 * este uso.
 */
export function buildGroupLabels(tasks: TaskDto[], nodes: WbsNodeDto[]): Map<string, string> {
  const { rootOf } = buildWbsIndex(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const labels = new Map<string, string>();

  for (const task of tasks) {
    const nodeId = task.wbsNode?.id;
    const root = nodeId ? byId.get(rootOf.get(nodeId) ?? nodeId) : undefined;
    labels.set(task.id, root ? `${root.code}. ${root.title}` : UNGROUPED_LABEL);
  }

  return labels;
}

/**
 * Ordem das linhas: por **início**, depois término, depois título.
 *
 * Antes as linhas saíam na ordem de `Task.order` — o campo global que o Backlog
 * usa para priorizar. Num cronograma isso não ajuda: a leitura natural é a do
 * tempo, de cima para baixo. Duas tarefas que começam no mesmo dia ficam
 * desempatadas pelo término (a mais curta antes) e, em último caso, pelo título,
 * para a ordem ser estável entre renders.
 *
 * Com `groupBy` ligado, a SVAR agrupa por pacote e esta ordem vale **dentro** de
 * cada pacote.
 */
function byStartDate(a: TaskDto, b: TaskDto): number {
  const start = (a.startDate ?? '').localeCompare(b.startDate ?? '');
  if (start !== 0) return start;
  const end = (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
  if (end !== 0) return end;
  return a.title.localeCompare(b.title);
}

export function buildGanttTasks(
  tasks: TaskDto[],
  milestones: MilestoneDto[],
  groupLabels: Map<string, string> = new Map(),
): GanttTask[] {
  const visible = tasks
    .filter((t) => !t.deletedAt && t.startDate && t.dueDate)
    .sort(byStartDate);
  // Tarefas que são pai de outra → renderizadas como resumo (summary) com expansor.
  const parents = new Set(visible.map((t) => t.parentId).filter(Boolean) as string[]);

  const taskItems: GanttTask[] = visible.map((t) => {
    // O ISO da API é meia-noite UTC quando não há hora, e em America/Sao_Paulo
    // isso é 21h do dia ANTERIOR — a barra inteira nasceria deslocada um dia,
    // além da coluna de texto. `toGanttDate` corrige isso sem achatar a hora de
    // quem tem hora de verdade.
    const start = toGanttDate(t.startDate!);
    const end = toGanttDate(t.dueDate!);
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
      group: groupLabels.get(t.id) ?? UNGROUPED_LABEL,
      // Linha de base (PMBOK): barra-fantasma do planejado aprovado.
      base_start: t.baselineStart ? toGanttDate(t.baselineStart) : undefined,
      base_end: t.baselineEnd ? toGanttDate(t.baselineEnd) : undefined,
    };
  });

  const msItems: GanttTask[] = [...milestones]
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    .map((m) => ({
    id: `ms-${m.id}`,
    text: m.title,
    start: parseCalendarDate(m.date),
    end: parseCalendarDate(m.date),
    progress: m.reached ? 100 : 0,
    type: 'milestone',
    parent: 0,
    assignee: '',
    css: 'gt-milestone',
    group: MILESTONE_GROUP_LABEL,
  }));

  // Marcos PRIMEIRO. Com `groupBy`, a SVAR ordena os grupos pela primeira
  // aparição na lista — anexar os marcos no fim jogava o grupo "Marcos" para o
  // rodapé do gráfico, que foi exatamente o que se viu na tela. Como faixa de
  // topo eles também ficam mais úteis: marco é referência de prazo, e serve de
  // régua para as barras que vêm abaixo.
  return [...msItems, ...taskItems];
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
  // 'Hoje' é instante (agora), não dia vindo da API — `new Date()` está certo aqui.
  const items: GanttMarker[] = [{ start: new Date(), text: 'Hoje' }];
  if (projectEnd) items.push({ start: parseCalendarDate(projectEnd), text: 'Término planejado' });
  const ends = ganttTasks.map((t) => t.end.getTime());
  if (ends.length) items.push({ start: new Date(Math.max(...ends)), text: 'Término estimado' });
  return items;
}
