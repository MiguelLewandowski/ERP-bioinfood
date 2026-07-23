import { CalendarRange, Flag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { formatDay } from '@/lib/dates';
import type { ScheduleHealth, ScheduleStatus } from '@/lib/project-metrics';

const STATUS: Record<ScheduleStatus, { label: string; variant: BadgeProps['variant'] }> = {
  ON_TRACK: { label: 'No prazo',   variant: 'success' },
  AT_RISK:  { label: 'Atenção',    variant: 'warning' },
  LATE:     { label: 'Atrasado',   variant: 'destructive' },
  UNKNOWN:  { label: 'Sem datas',  variant: 'neutral' },
};

function driftText(driftDays: number): string {
  if (driftDays === 0) return 'Previsão bate com o planejado.';
  const days = Math.abs(driftDays);
  const plural = days === 1 ? 'dia' : 'dias';
  return driftDays > 0
    ? `${days} ${plural} além do planejado.`
    : `${days} ${plural} de folga sobre o planejado.`;
}

export function ScheduleCard({ schedule }: { schedule: ScheduleHealth }) {
  const status = STATUS[schedule.status];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CalendarRange size={15} className="text-primary" /> Cronograma
        </CardTitle>
        <Badge variant={status.variant}>{status.label}</Badge>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs text-muted-foreground">Início</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {schedule.startDate ? formatDay(schedule.startDate, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Término planejado</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {schedule.endDate ? formatDay(schedule.endDate, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Término previsto</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {schedule.forecastEndDate
                ? formatDay(schedule.forecastEndDate, { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—'}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-muted-foreground">
          {schedule.driftDays === null
            ? 'Defina a data de término nas configurações e prazos nas tarefas para acompanhar o desvio.'
            : driftText(schedule.driftDays)}
        </p>

        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Flag size={12} aria-hidden="true" />
          {schedule.hasBaseline
            ? 'Linha de base congelada — o Gantt compara o real com ela.'
            : 'Sem linha de base. Congele o cronograma para medir desvio.'}
        </p>
      </CardContent>
    </Card>
  );
}
