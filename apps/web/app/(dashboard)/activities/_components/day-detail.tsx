'use client'; // dialog com as atividades de um dia

import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X } from 'lucide-react';
import type { ActivityDto } from '@bioinfood/shared';
import { ActivityCard } from '@/components/activities/activity-card';

interface DayDetailProps {
  date: Date;
  activities: ActivityDto[];
  onClose: () => void;
  onSelectActivity: (activity: ActivityDto) => void;
}

export function DayDetail({ date, activities, onClose, onSelectActivity }: DayDetailProps) {
  const isToday = isSameDay(date, new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold capitalize text-[#1D1D1B]">
              {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h2>
            {isToday && (
              <span className="rounded-full bg-[#DCEFD6] px-2 py-0.5 text-[10px] font-semibold text-[#156D1D]">
                Hoje
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded p-0.5 text-[#706F6F] hover:text-[#575756] focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto px-6 py-4">
          {activities.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#878787]">Nenhuma atividade neste dia.</p>
          ) : (
            activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} onClick={onSelectActivity} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
