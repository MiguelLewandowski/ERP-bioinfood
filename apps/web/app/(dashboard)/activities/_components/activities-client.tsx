'use client'; // filtro de período interativo + fetch client-side

import { useEffect, useMemo, useState } from 'react';
import {
  startOfWeek, endOfWeek, addWeeks, format, isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';
import type { ActivityDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { activitiesApi } from '@/lib/api-hooks';
import { groupByDay, formatDayLabel } from '@/lib/activities';
import { ActivityCard } from '@/components/activities/activity-card';

function toInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Limites ISO cobrindo o dia inteiro (início 00:00 → fim 23:59:59.999).
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

export function ActivitiesClient() {
  const { token } = useAuth();
  const [from, setFrom] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [to, setTo] = useState(() => endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    activitiesApi
      .list({ from: dayStart(from).toISOString(), to: dayEnd(to).toISOString() }, token)
      .then((data) => { if (active) setActivities(data); })
      .catch(() => { if (active) setActivities([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, token]);

  const blocks = useMemo(
    () => groupByDay(activities, { start: dayStart(from), end: dayEnd(to) }),
    [activities, from, to],
  );

  function shiftWeek(direction: -1 | 1) {
    setFrom((f) => addWeeks(f, direction));
    setTo((t) => addWeeks(t, direction));
  }

  function goToThisWeek() {
    setFrom(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setTo(endOfWeek(new Date(), { weekStartsOn: 1 }));
  }

  return (
    <div>
      {/* Barra de filtro de período */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftWeek(-1)}
            className="rounded-lg p-1.5 text-[#575756] hover:bg-gray-100"
            title="Semana anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => shiftWeek(1)}
            className="rounded-lg p-1.5 text-[#575756] hover:bg-gray-100"
            title="Próxima semana"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={goToThisWeek}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#575756] hover:bg-gray-50"
        >
          <CalendarDays size={13} /> Semana atual
        </button>

        <div className="ml-auto flex items-center gap-2 text-xs text-[#575756]">
          <label className="flex items-center gap-1.5">
            De
            <input
              type="date"
              value={toInputValue(from)}
              max={toInputValue(to)}
              onChange={(e) => e.target.value && setFrom(new Date(`${e.target.value}T00:00:00`))}
              className="rounded-lg border border-gray-200 px-2 py-1.5 focus:border-[#52B552] focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5">
            até
            <input
              type="date"
              value={toInputValue(to)}
              min={toInputValue(from)}
              onChange={(e) => e.target.value && setTo(new Date(`${e.target.value}T00:00:00`))}
              className="rounded-lg border border-gray-200 px-2 py-1.5 focus:border-[#52B552] focus:outline-none"
            />
          </label>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#878787]">
          <Loader2 size={16} className="animate-spin" /> Carregando atividades…
        </div>
      ) : blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-sm text-[#878787]">
          Nenhuma atividade no período selecionado.
        </div>
      ) : (
        <div className="space-y-6">
          {blocks.map((block) => (
            <section key={block.key}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-bold capitalize text-[#1D1D1B]">
                  {formatDayLabel(block.date)}
                </h2>
                {isSameDay(block.date, new Date()) && (
                  <span className="rounded-full bg-[#DCEFD6] px-2 py-0.5 text-[10px] font-semibold text-[#156D1D]">
                    Hoje
                  </span>
                )}
                <span className="text-xs text-[#878787]">
                  {block.activities.length} {block.activities.length === 1 ? 'atividade' : 'atividades'}
                </span>
              </div>
              <div className="space-y-2">
                {block.activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
