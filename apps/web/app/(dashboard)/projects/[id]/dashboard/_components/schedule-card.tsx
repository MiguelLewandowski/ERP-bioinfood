import { CalendarRange, Flag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDay } from '@/lib/dates';
import type { ScheduleHealth, ScheduleStatus } from '@/lib/project-metrics';

const STATUS: Record<ScheduleStatus, { label: string; variant: BadgeProps['variant'] }> = {
  ON_TRACK: { label: 'No prazo',   variant: 'success' },
  AT_RISK:  { label: 'Atenção',    variant: 'warning' },
  LATE:     { label: 'Atrasado',   variant: 'destructive' },
  UNKNOWN:  { label: 'Sem datas',  variant: 'neutral' },
};

/** Mesma faixa do badge de status — as duas peças não podem discordar de cor. */
const DRIFT_TONE: Record<ScheduleStatus, string> = {
  ON_TRACK: 'bg-success/10 text-primary',
  AT_RISK:  'bg-warning/20 text-accent',
  LATE:     'bg-destructive/10 text-destructive',
  UNKNOWN:  'bg-muted text-muted-foreground',
};

function driftText(driftDays: number): string {
  if (driftDays === 0) return 'previsão bate com o planejado.';
  const days = Math.abs(driftDays);
  return driftDays > 0 ? 'além do planejado.' : `de folga sobre o planejado (${days}).`;
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

        {/* O desvio é o número que decide se alguém age — ficava como texto
            cinza de rodapé, do mesmo peso do aviso de linha de base. */}
        {schedule.driftDays === null ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Defina a data de término nas configurações e prazos nas tarefas para acompanhar o desvio.
          </p>
        ) : (
          <div className={cn('mt-3 flex items-baseline gap-2 rounded-lg px-3 py-2', DRIFT_TONE[schedule.status])}>
            <span className="text-xl font-bold tabular-nums leading-none">
              {schedule.driftDays > 0 ? `+${schedule.driftDays}` : schedule.driftDays === 0 ? '0' : schedule.driftDays}
            </span>
            <span className="text-xs font-medium">
              {schedule.driftDays === 1 || schedule.driftDays === -1 ? 'dia' : 'dias'} · {driftText(schedule.driftDays)}
            </span>
          </div>
        )}

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
