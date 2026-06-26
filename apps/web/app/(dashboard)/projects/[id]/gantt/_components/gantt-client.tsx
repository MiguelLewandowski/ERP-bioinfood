'use client';

import 'gantt-task-react/dist/index.css';
import dynamic from 'next/dynamic';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { BarChart2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { Task as GanttTask, StylingOption } from 'gantt-task-react';
import { ViewMode } from 'gantt-task-react';
import type { TaskDto as Task, MilestoneDto as Milestone } from '@bioinfood/shared';
import { checklistProgress } from '@bioinfood/shared';

const GanttLib = dynamic(() => import('gantt-task-react').then((m) => m.Gantt), { ssr: false });

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  TODO:        '#878787',
  IN_PROGRESS: '#147F23',
  DONE:        '#46AD48',
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
};

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function diffMonths(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
}

function diffWeeks(a: Date, b: Date): number {
  return Math.ceil(diffDays(a, b) / 7) + 1;
}

function ptBRDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── types ────────────────────────────────────────────────────────────────────

interface GanttClientProps {
  projectId: string;
  token: string;
  tasks: Task[];
  milestones: Milestone[];
  projectStart: string | null;
  projectEnd: string | null;
}

// ─── custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ task }: { task: GanttTask; fontSize: string; fontFamily: string }) {
  const durationDays = diffDays(task.start, task.end);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 min-w-[200px] text-sm">
      <p className="font-bold text-[#1D1D1B] mb-1 leading-snug">{task.name}</p>
      <div className="space-y-0.5 text-xs text-[#575756]">
        <p>Início: <span className="font-medium text-[#1D1D1B]">{ptBRDate(task.start)}</span></p>
        <p>Término: <span className="font-medium text-[#1D1D1B]">{ptBRDate(task.end)}</span></p>
        {task.type === 'task' && (
          <>
            <p>Duração: <span className="font-medium text-[#1D1D1B]">{durationDays}d</span></p>
            <p>Progresso: <span className="font-medium text-[#1D1D1B]">{task.progress}%</span></p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── custom task list header ──────────────────────────────────────────────────

function TaskListHeader({ headerHeight, rowWidth }: { headerHeight: number; rowWidth: string; fontFamily: string; fontSize: string }) {
  return (
    <div
      style={{ height: headerHeight, width: rowWidth, minWidth: rowWidth }}
      className="flex items-center px-3 bg-gray-50 border-b border-r border-gray-200"
    >
      <span className="text-xs font-bold text-[#706F6F] uppercase tracking-wide">Tarefa</span>
    </div>
  );
}

// ─── custom task list table ───────────────────────────────────────────────────

function TaskListTable({
  tasks, rowHeight, rowWidth, selectedTaskId, setSelectedTask, onExpanderClick,
}: {
  tasks: GanttTask[]; rowHeight: number; rowWidth: string; fontFamily: string;
  fontSize: string; locale: string; selectedTaskId: string;
  setSelectedTask: (id: string) => void; onExpanderClick: (t: GanttTask) => void;
}) {
  return (
    <div style={{ width: rowWidth, minWidth: rowWidth }} className="border-r border-gray-200">
      {tasks.map((task) => {
        const isSelected = task.id === selectedTaskId;
        const isMilestone = task.type === 'milestone';
        return (
          <div
            key={task.id}
            style={{ height: rowHeight }}
            onClick={() => setSelectedTask(task.id)}
            className={`flex items-center px-3 gap-2 cursor-pointer border-b border-gray-100 transition-colors ${
              isSelected ? 'bg-[#86C175]/20' : 'hover:bg-gray-50'
            }`}
          >
            {task.hideChildren !== undefined && (
              <button
                onClick={(e) => { e.stopPropagation(); onExpanderClick(task); }}
                className="text-[#706F6F] hover:text-[#147F23] shrink-0"
              >
                {task.hideChildren ? '▶' : '▼'}
              </button>
            )}
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: isMilestone ? '#DD8005' : (task.styles?.progressColor ?? '#878787') }}
            />
            <span
              className="text-xs font-medium text-[#1D1D1B] truncate flex-1"
              title={task.name}
            >
              {task.name}
            </span>
            {task.type === 'task' && (
              <span className="text-[10px] text-[#878787] shrink-0">{task.progress}%</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function GanttClient({ projectId, token, tasks, milestones, projectStart, projectEnd }: GanttClientProps) {
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(900);
  const [viewMode, setViewMode]     = useState<ViewMode>(ViewMode.Week);

  // Measure container width
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width);
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Build gantt tasks from API data
  const ganttTasks = useMemo<GanttTask[]>(() => {
    const taskItems: GanttTask[] = tasks
      .filter((t) => !t.deletedAt && t.startDate && t.dueDate)
      .map((t) => {
        const start = new Date(t.startDate!);
        const end   = new Date(t.dueDate!);
        const safeEnd = end <= start ? addDays(start, 1) : end;
        const predecessorIds = (t.predecessors ?? []).map((p) => p.predecessorId);
        return {
          id:           t.id,
          name:         t.title,
          start,
          end:          safeEnd,
          type:         'task' as const,
          progress:     t.checklist?.length > 0
            ? checklistProgress(t.checklist)
            : (t.status === 'DONE' ? 100 : t.status === 'IN_PROGRESS' ? 50 : 0),
          dependencies: predecessorIds,
          styles: {
            backgroundColor:         STATUS_COLOR[t.status] + '33',
            backgroundSelectedColor: STATUS_COLOR[t.status] + '55',
            progressColor:           STATUS_COLOR[t.status],
            progressSelectedColor:   STATUS_COLOR[t.status],
          },
          isDisabled: false,
          displayOrder: undefined,
        };
      });

    const msItems: GanttTask[] = milestones.map((m) => ({
      id:       `ms-${m.id}`,
      name:     m.title,
      start:    new Date(m.date),
      end:      new Date(m.date),
      type:     'milestone' as const,
      progress: m.reached ? 100 : 0,
      styles:   { progressColor: '#DD8005', progressSelectedColor: '#C16C06' },
      isDisabled: false,
      displayOrder: undefined,
    }));

    return [...taskItems, ...msItems];
  }, [tasks, milestones]);

  // Compute date range: from earliest task or project start to latest task or project end
  const { rangeStart, rangeEnd } = useMemo(() => {
    const allDates = ganttTasks.flatMap((t) => [t.start, t.end]);
    if (projectStart) allDates.push(new Date(projectStart));
    if (projectEnd)   allDates.push(new Date(projectEnd));

    if (allDates.length === 0) {
      const now = new Date();
      return { rangeStart: now, rangeEnd: addDays(now, 90) };
    }

    const min = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const max = new Date(Math.max(...allDates.map((d) => d.getTime())));
    return {
      rangeStart: addDays(min, -3),
      rangeEnd:   addDays(max,  5),
    };
  }, [ganttTasks, projectStart, projectEnd]);

  // Auto-select best view mode based on duration
  useEffect(() => {
    const days = diffDays(rangeStart, rangeEnd);
    if (days <= 21)       setViewMode(ViewMode.Day);
    else if (days <= 90)  setViewMode(ViewMode.Week);
    else                  setViewMode(ViewMode.Month);
  }, [rangeStart, rangeEnd]);

  // Compute columnWidth to fill the container without excess horizontal scroll
  const columnWidth = useMemo(() => {
    const LIST_WIDTH = 220;
    const available  = Math.max(containerW - LIST_WIDTH - 2, 200);
    const days       = diffDays(rangeStart, rangeEnd);

    if (viewMode === ViewMode.Day)   return Math.max(28, Math.floor(available / days));
    if (viewMode === ViewMode.Week)  return Math.max(80, Math.floor(available / diffWeeks(rangeStart, rangeEnd)));
    /* Month */                       return Math.max(120, Math.floor(available / diffMonths(rangeStart, rangeEnd)));
  }, [containerW, rangeStart, rangeEnd, viewMode]);

  const handleFitView = useCallback(() => {
    const days = diffDays(rangeStart, rangeEnd);
    if (days <= 21)       setViewMode(ViewMode.Day);
    else if (days <= 90)  setViewMode(ViewMode.Week);
    else                  setViewMode(ViewMode.Month);
  }, [rangeStart, rangeEnd]);

  const noData = ganttTasks.length === 0;

  const stylingOptions: StylingOption = {
    headerHeight:   50,
    rowHeight:      40,
    barFill:        72,
    barCornerRadius: 4,
    columnWidth,
    listCellWidth:  '220px',
    fontSize:       '12px',
    fontFamily:     'Inter, system-ui, sans-serif',
    todayColor:     'rgba(20,127,35,0.10)',
    arrowColor:     '#147F23',
    arrowIndent:    12,
    ganttHeight:    Math.min(600, Math.max(300, ganttTasks.length * 40 + 55)),
    TooltipContent: CustomTooltip,
    TaskListHeader,
    TaskListTable,
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1B]">Cronograma (Gantt)</h2>
          <p className="text-sm text-[#706F6F] mt-0.5">
            {ganttTasks.filter((t) => t.type === 'task').length} tarefas ·{' '}
            {milestones.length} marcos
            {projectStart && projectEnd && (
              <> · {ptBRDate(new Date(projectStart))} → {ptBRDate(new Date(projectEnd))}</>
            )}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleFitView}
            title="Ajustar ao projeto"
            className="p-2 rounded-lg border border-gray-200 hover:border-[#52B552] hover:text-[#147F23] text-[#575756] transition-colors"
          >
            <Maximize2 size={15} />
          </button>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {([ViewMode.Day, ViewMode.Week, ViewMode.Month] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={viewMode === mode
                  ? { backgroundColor: '#147F23', color: '#FFFFFF' }
                  : { color: '#575756' }}
              >
                {mode === ViewMode.Day ? 'Dia' : mode === ViewMode.Week ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {noData ? (
        <div className="bg-white rounded-xl border border-gray-200 py-24 flex flex-col items-center gap-3">
          <BarChart2 size={40} style={{ color: '#878787' }} />
          <p className="text-sm font-medium text-[#575756]">Nenhuma tarefa com início e prazo definidos.</p>
          <p className="text-xs text-[#706F6F]">Edite tarefas no Backlog ou Kanban e preencha as datas.</p>
        </div>
      ) : (
        <div ref={wrapperRef} className="bg-white rounded-xl border border-gray-200 overflow-hidden gantt-wrapper">
          <GanttLib
            tasks={ganttTasks}
            viewMode={viewMode}
            viewDate={rangeStart}
            locale="pt-BR"
            {...stylingOptions}
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-5 flex-wrap">
        {[
          { color: '#878787', label: 'A fazer' },
          { color: '#147F23', label: 'Em andamento' },
          { color: '#46AD48', label: 'Concluído' },
          { color: '#DD8005', label: 'Marco' },
          { color: '#147F23', label: 'Seta = dependência', dashed: true },
        ].map(({ color, label, dashed }) => (
          <div key={label} className="flex items-center gap-1.5">
            {dashed
              ? <span className="w-6 border-t-2 border-dashed" style={{ borderColor: color }} />
              : <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />}
            <span className="text-xs text-[#706F6F]">{label}</span>
          </div>
        ))}
      </div>

      {/* Hint about dependencies */}
      {ganttTasks.some((t) => (t.dependencies?.length ?? 0) > 0) && (
        <p className="text-xs text-[#878787]">
          Setas verdes indicam dependências Finish-to-Start entre tarefas.
        </p>
      )}
    </div>
  );
}
