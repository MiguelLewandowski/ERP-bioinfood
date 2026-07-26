'use client'; // dialog com as atividades de um dia

import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ActivityDto } from '@bioinfood/shared';
import { ActivityCard } from '@/components/activities/activity-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface DayDetailProps {
  date: Date;
  activities: ActivityDto[];
  onClose: () => void;
  onSelectActivity: (activity: ActivityDto) => void;
}

export function DayDetail({ date, activities, onClose, onSelectActivity }: DayDetailProps) {
  const isToday = isSameDay(date, new Date());

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      {/* Coluna flex com altura limitada: o cabeçalho fica fixo e só a lista
          rola. Sem isso o filho (grid) não encolhe e a lista vaza para fora da
          caixa quando o dia tem muitas atividades. */}
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[80vh]">
        <DialogHeader className="shrink-0 flex-row items-center gap-2 border-b border-border py-4 pl-5 pr-12 sm:pl-6">
          <DialogTitle className="truncate text-sm capitalize sm:text-base">
            {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </DialogTitle>
          {isToday && <Badge variant="success" className="shrink-0 text-[10px]">Hoje</Badge>}
          <span className="ml-auto shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">
            {activities.length} {activities.length === 1 ? 'atividade' : 'atividades'}
          </span>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-6">
          {activities.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade neste dia.</p>
          ) : (
            activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} onClick={onSelectActivity} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
