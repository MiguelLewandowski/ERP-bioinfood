'use client'; // grade mensal interativa (clique abre detalhe)

import { useMemo } from 'react';
import { format, isSameDay, isSameMonth } from 'date-fns';
import type { ActivityDto } from '@bioinfood/shared';
import {
  buildMonthGrid, layoutWeekBars, effectiveInterval, isOverdue,
  STATUS_META, PRIORITY_META, OVERDUE_COLOR,
} from '@/lib/activities';

interface MonthCalendarProps {
  cursor: Date;
  activities: ActivityDto[];
  onSelectActivity: (activity: ActivityDto) => void;
  onSelectDay: (date: Date, activities: ActivityDto[]) => void;
}

/**
 * Trilhas de barras por semana.
 *
 * Era um teto FIXO de 3: qualquer semana com quatro atividades escondia a
 * quarta atrás de "+1 mais", e só clicando dava para saber o que era. Agora a
 * linha da semana **cresce até caber** — e o teto só existe para uma semana
 * atípica não empurrar as outras para fora da tela.
 *
 * Semana tranquila continua com a mesma altura de antes (`MIN_LANES`), então o
 * calendário não fica esparso à toa.
 */
const MIN_LANES = 3;
const MAX_LANES = 8;

const LANE_HEIGHT = 20;
const LANE_GAP = 3;
/** Altura do número do dia + respiro, acima da primeira trilha. */
const HEADER_OFFSET = 32;
const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

export function MonthCalendar({ cursor, activities, onSelectActivity, onSelectDay }: MonthCalendarProps) {
  const weeks = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const today = new Date();

  // Atividades cujo intervalo efetivo cobre o dia informado.
  function activitiesForDay(day: Date): ActivityDto[] {
    const d = day.getTime();
    return activities.filter((a) => {
      const iv = effectiveInterval(a);
      return iv !== null && iv.start.getTime() <= d && d <= iv.end.getTime();
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {WEEKDAYS.map((label, i) => (
          <div
            key={label}
            className={`px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide ${
              i >= 5 ? 'text-muted-foreground/60' : 'text-muted-foreground'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Semanas */}
      {weeks.map((days) => {
        const bars = layoutWeekBars(days, activities);
        // Quantas trilhas esta semana precisa, dentro do teto.
        const needed = bars.reduce((max, b) => Math.max(max, b.lane + 1), 0);
        const lanes = Math.min(Math.max(needed, MIN_LANES), MAX_LANES);
        const visible = bars.filter((b) => b.lane < lanes);
        const hidden = bars.filter((b) => b.lane >= lanes);
        const rowHeight = HEADER_OFFSET + lanes * (LANE_HEIGHT + LANE_GAP);

        return (
          <div key={days[0].toISOString()} className="relative grid grid-cols-7 border-b border-gray-200 last:border-b-0">
            {/* Camada de fundo: células (clicáveis) com número do dia + "+N" */}
            {days.map((day, i) => {
              const inMonth = isSameMonth(day, cursor);
              const isToday = isSameDay(day, today);
              const isWeekend = i >= 5;
              const col = Math.round((day.getTime() - days[0].getTime()) / 86_400_000);
              const hiddenCount = hidden.filter((b) => col >= b.colStart && col < b.colStart + b.span).length;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onSelectDay(day, activitiesForDay(day))}
                  style={{ minHeight: rowHeight }}
                  className={`flex flex-col border-r border-gray-100 px-1 pt-1 text-left transition-colors last:border-r-0 hover:bg-success/10 ${
                    isToday ? 'bg-success/10' : !inMonth ? 'bg-gray-50/60' : isWeekend ? 'bg-gray-50/40' : ''
                  }`}
                >
                  <span
                    className={`ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday
                        ? 'bg-primary font-bold text-white'
                        : inMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/60'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {hiddenCount > 0 && (
                    <span
                      className="mt-auto truncate whitespace-nowrap rounded pb-1 pl-1 text-[10px] font-medium text-muted-foreground"
                      title={`Mais ${hiddenCount} ${hiddenCount === 1 ? 'atividade' : 'atividades'} — clique para ver`}
                    >
                      +{hiddenCount} mais
                    </span>
                  )}
                </button>
              );
            })}

            {/* Camada de barras posicionadas */}
            <div
              className="pointer-events-none absolute inset-x-0 top-8 grid grid-cols-7 gap-x-1 px-1"
              style={{ gridAutoRows: `${LANE_HEIGHT}px`, rowGap: `${LANE_GAP}px` }}
            >
              {visible.map((bar) => {
                const status = STATUS_META[bar.activity.status];
                const priority = PRIORITY_META[bar.activity.priority];
                const overdue = isOverdue(bar.activity);
                return (
                  <button
                    key={bar.activity.id + bar.colStart}
                    onClick={() => onSelectActivity(bar.activity)}
                    title={`${bar.activity.title} · ${bar.activity.project.name}`}
                    className="pointer-events-auto flex items-center truncate rounded border-l-2 px-1.5 text-left text-[11px] font-medium leading-tight hover:opacity-80"
                    style={{
                      gridColumn: `${bar.colStart + 1} / span ${bar.span}`,
                      gridRow: bar.lane + 1,
                      backgroundColor: status.bg,
                      color: status.color,
                      borderColor: overdue ? OVERDUE_COLOR : priority.color,
                    }}
                  >
                    <span className="truncate">{bar.activity.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
