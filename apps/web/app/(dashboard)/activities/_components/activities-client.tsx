'use client'; // filtro de período interativo + fetch client-side

import { useEffect, useMemo, useState } from 'react';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, addMonths, format, isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, Filter } from 'lucide-react';
import type { ActivityDto } from '@bioinfood/shared';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';
import { activitiesApi } from '@/lib/api-hooks';
import {
  groupByDay, formatDayLabel, filterActivities, summarize,
  STATUS_META, OVERDUE_COLOR, EMPTY_FILTERS, type ActivityFilters,
} from '@/lib/activities';
import { ActivityCard } from '@/components/activities/activity-card';
import { MonthCalendar } from './month-calendar';
import { ActivitiesFilters } from './activities-filters';
import { ActivityDetail } from './activity-detail';
import { DayDetail } from './day-detail';

type ViewMode = 'month' | 'week';

function dayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function dayEnd(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function rangeFor(mode: ViewMode, cursor: Date): { start: Date; end: Date } {
  if (mode === 'week') {
    return {
      start: startOfWeek(cursor, { weekStartsOn: 1 }),
      end: endOfWeek(cursor, { weekStartsOn: 1 }),
    };
  }
  return {
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  };
}

export function ActivitiesClient() {
  const { token, session } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<ActivityFilters>({ ...EMPTY_FILTERS, currentUserId: session.sub });
  const [selectedActivity, setSelectedActivity] = useState<ActivityDto | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: Date; activities: ActivityDto[] } | null>(null);

  const { start, end } = useMemo(() => rangeFor(viewMode, cursor), [viewMode, cursor]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    activitiesApi
      .list({ from: dayStart(start).toISOString(), to: dayEnd(end).toISOString() }, token)
      .then((data) => { if (active) setActivities(data); })
      .catch(() => { if (active) setActivities([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [start, end, token]);

  const filtered = useMemo(() => filterActivities(activities, filters), [activities, filters]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const blocks = useMemo(
    () => groupByDay(filtered, { start: dayStart(start), end: dayEnd(end) }),
    [filtered, start, end],
  );

  function shift(direction: -1 | 1) {
    setCursor((c) => (viewMode === 'week' ? addWeeks(c, direction) : addMonths(c, direction)));
  }

  function patchFilters(patch: Partial<ActivityFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  function resetFilters() {
    setFilters({ ...EMPTY_FILTERS, currentUserId: session.sub });
  }

  // Há filtro ativo? Decide se o estado vazio oferece "limpar filtros" ou
  // apenas informa que o período está livre — são causas diferentes.
  const isFiltering = useMemo(
    () => (Object.keys(EMPTY_FILTERS) as Array<keyof typeof EMPTY_FILTERS>)
      .some((k) => filters[k] !== EMPTY_FILTERS[k]),
    [filters],
  );

  const periodLabel = viewMode === 'month'
    ? format(cursor, "MMMM 'de' yyyy", { locale: ptBR })
    : `${format(start, 'dd MMM', { locale: ptBR })} – ${format(end, 'dd MMM', { locale: ptBR })}`;

  return (
    <div>
      {/* Barra de controles */}
      <div className="mb-4 space-y-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => shift(-1)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100"
              title={viewMode === 'week' ? 'Semana anterior' : 'Mês anterior'}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => shift(1)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100"
              title={viewMode === 'week' ? 'Próxima semana' : 'Próximo mês'}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={() => setCursor(new Date())}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-gray-50"
          >
            <CalendarDays size={13} /> Hoje
          </button>
          <span className="text-sm font-semibold capitalize text-foreground">{periodLabel}</span>

          <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
            {(['month', 'week'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                style={viewMode === mode
                  ? { backgroundColor: 'hsl(var(--primary))', color: 'white' }
                  : { color: 'hsl(var(--muted-foreground))' }}
              >
                {mode === 'month' ? 'Mês' : 'Semana'}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <ActivitiesFilters
            activities={activities}
            filters={filters}
            onChange={patchFilters}
            onReset={() => setFilters({ ...EMPTY_FILTERS, currentUserId: session.sub })}
          />
        </div>
      </div>

      {/* Resumo — os chips SÃO a legenda.
          Antes havia cinco chips numéricos e, ao lado, uma legenda de quatro
          quadradinhos coloridos com os mesmos rótulos: duas gramáticas visuais
          para o mesmo conceito, ocupando uma faixa inteira acima do calendário.
          Agora o chip carrega a cor, e clicar nele filtra — vira legenda e
          controle ao mesmo tempo. */}
      <div className="mb-5 flex flex-wrap gap-2">
        <SummaryChip
          label="Total" value={summary.total} color="hsl(var(--foreground))"
          active={filters.status === '' && !filters.onlyOverdue}
          onClick={() => patchFilters({ status: '', onlyOverdue: false })}
        />
        {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((s) => (
          <SummaryChip
            key={s}
            label={STATUS_META[s].label}
            value={s === 'TODO' ? summary.todo : s === 'IN_PROGRESS' ? summary.inProgress : summary.done}
            color={STATUS_META[s].color}
            swatch={STATUS_META[s].bg}
            active={filters.status === s}
            onClick={() => patchFilters({ status: filters.status === s ? '' : s, onlyOverdue: false })}
          />
        ))}
        <SummaryChip
          label="Atrasadas" value={summary.overdue}
          color={OVERDUE_COLOR} swatch="hsl(var(--destructive) / 0.12)"
          active={filters.onlyOverdue}
          onClick={() => patchFilters({ onlyOverdue: !filters.onlyOverdue, status: '' })}
        />
      </div>

      {/* Conteúdo */}
      {loading ? (
        viewMode === 'month' ? <MonthSkeleton /> : <WeekSkeleton />
      ) : viewMode === 'month' ? (
        <MonthCalendar
          cursor={cursor}
          activities={filtered}
          onSelectActivity={setSelectedActivity}
          onSelectDay={(date, acts) => setSelectedDay({ date, activities: acts })}
        />
      ) : blocks.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-6">
          <EmptyState
            icon={isFiltering ? Filter : CalendarDays}
            title={isFiltering ? 'Nada bate com os filtros' : 'Nenhuma atividade no período'}
            description={
              isFiltering
                ? 'Há atividades neste período, mas nenhuma passa pelos filtros atuais.'
                : 'Nenhuma atividade começa, corre ou vence entre estas datas.'
            }
            action={
              isFiltering
                ? <Button variant="outline" onClick={resetFilters}>Limpar filtros</Button>
                : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {blocks.map((block) => (
            <section key={block.key}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-bold capitalize text-foreground">
                  {formatDayLabel(block.date)}
                </h2>
                {isSameDay(block.date, new Date()) && (
                  <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-semibold text-primary-dark">
                    Hoje
                  </span>
                )}
                {block.due.length > 0 && (
                  <span className="text-xs font-medium text-foreground">
                    {block.due.length} {block.due.length === 1 ? 'vence' : 'vencem'}
                  </span>
                )}
                {block.ongoing.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {block.ongoing.length} em andamento
                  </span>
                )}
              </div>

              {/* O que VENCE no dia vem primeiro e em peso normal — é o que
                  exige ação. O que só está correndo vira contexto recolhido:
                  listar os dois com o mesmo peso faria uma tarefa de cinco
                  semanas aparecer 35 vezes competindo com o prazo de hoje. */}
              <div className="space-y-2">
                {block.due.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} onClick={setSelectedActivity} />
                ))}
              </div>

              {block.ongoing.length > 0 && (
                <details className="mt-2 group">
                  <summary className="cursor-pointer list-none rounded-lg px-1 py-1 text-xs text-muted-foreground hover:text-foreground">
                    <ChevronRight size={12} className="mr-1 inline transition-transform group-open:rotate-90" />
                    {block.ongoing.length} em andamento neste dia
                  </summary>
                  <div className="mt-2 space-y-2 opacity-75">
                    {block.ongoing.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        onClick={setSelectedActivity}
                      />
                    ))}
                  </div>
                </details>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {selectedDay && (
        <DayDetail
          date={selectedDay.date}
          activities={selectedDay.activities}
          onClose={() => setSelectedDay(null)}
          onSelectActivity={(a) => { setSelectedDay(null); setSelectedActivity(a); }}
        />
      )}
      {selectedActivity && (
        <ActivityDetail activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}
    </div>
  );
}

/**
 * Chip do resumo — número, rótulo e a cor do próprio status. Clicável: é o
 * filtro rápido e a legenda ao mesmo tempo, o que dispensou a faixa de
 * quadradinhos que existia ao lado dizendo a mesma coisa.
 */
function SummaryChip({
  label, value, color, swatch, active, onClick,
}: {
  label: string;
  value: number;
  color: string;
  swatch?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? `Mostrando só: ${label}. Clique para remover o filtro.` : `Filtrar por ${label}`}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'border-foreground/25 bg-muted' : 'border-border bg-card hover:bg-muted/50',
      )}
    >
      {swatch && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: swatch, border: `1px solid ${color}` }}
          aria-hidden
        />
      )}
      <span className="text-lg font-bold leading-none" style={{ color }}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}

function MonthSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="px-2 py-2 text-center">
            <span className="mx-auto block h-2 w-6 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, r) => (
        <div key={r} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
          {Array.from({ length: 7 }).map((_, c) => (
            <div key={c} className="min-h-[116px] border-r border-gray-100 p-2 last:border-r-0">
              <span className="block h-5 w-5 rounded-full bg-gray-100" />
              <span className="mt-2 block h-3 w-3/4 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function WeekSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, s) => (
        <section key={s}>
          <span className="mb-2 block h-4 w-40 rounded bg-gray-200" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg border border-gray-200 bg-gray-50" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
