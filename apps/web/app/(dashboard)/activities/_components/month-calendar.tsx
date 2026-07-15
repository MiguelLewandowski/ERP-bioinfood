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

const MAX_LANES = 3; // trilhas de barras visíveis por linha antes do "+N"
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
              i >= 5 ? 'text-[#B5B5B5]' : 'text-[#878787]'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Semanas */}
      {weeks.map((days) => {
        const bars = layoutWeekBars(days, activities);
        const visible = bars.filter((b) => b.lane < MAX_LANES);
        const hidden = bars.filter((b) => b.lane >= MAX_LANES);

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
                  className={`flex min-h-[116px] flex-col border-r border-gray-100 px-1 pt-1 text-left transition-colors last:border-r-0 hover:bg-[#F0F7EF] ${
                    isToday ? 'bg-[#F3FAF2]' : !inMonth ? 'bg-gray-50/60' : isWeekend ? 'bg-gray-50/40' : ''
                  }`}
                >
                  <span
                    className={`ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday
                        ? 'bg-[#147F23] font-bold text-white'
                        : inMonth
                          ? 'text-[#1D1D1B]'
                          : 'text-[#B5B5B5]'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {hiddenCount > 0 && (
                    <span
                      className="mt-auto truncate whitespace-nowrap rounded pb-1 pl-1 text-[10px] font-medium text-[#575756]"
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
              style={{ gridAutoRows: '20px', rowGap: '3px' }}
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
