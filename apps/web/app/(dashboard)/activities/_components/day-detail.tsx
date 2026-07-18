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
      <DialogContent className="max-h-[80vh] gap-0 p-0">
        <DialogHeader className="flex-row items-center gap-2 border-b border-border px-6 py-4">
          <DialogTitle className="text-base capitalize">
            {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </DialogTitle>
          {isToday && <Badge variant="success" className="text-[10px]">Hoje</Badge>}
        </DialogHeader>

        <div className="space-y-2 overflow-y-auto px-6 py-4">
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
