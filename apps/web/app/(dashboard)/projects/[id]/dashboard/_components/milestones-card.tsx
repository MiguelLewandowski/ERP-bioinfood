import Link from 'next/link';
import { ArrowRight, Map, Milestone } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDay } from '@/lib/dates';
import type { MilestoneMetrics } from '@/lib/project-metrics';

interface MilestonesCardProps {
  projectId: string;
  metrics: MilestoneMetrics;
}

export function MilestonesCard({ projectId, metrics }: MilestonesCardProps) {
  const isEmpty = metrics.total === 0;
  const nothingPending = metrics.next.length === 0 && metrics.overdue.length === 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Milestone size={15} className="text-primary" /> Marcos
          {metrics.total > 0 && (
            <Badge variant="neutral">{metrics.reached}/{metrics.total} atingidos</Badge>
          )}
        </CardTitle>
        <Link
          href={`/projects/${projectId}/roadmap`}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver roadmap <ArrowRight size={12} />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {isEmpty ? (
          <EmptyState
            icon={Map}
            title="Nenhum marco definido"
            description="Marcos do roadmap aparecem aqui em ordem de data."
            className="py-8"
          />
        ) : nothingPending ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Todos os marcos foram atingidos.
          </p>
        ) : (
          <>
            {metrics.overdue.map((m) => (
              <MilestoneRow key={m.id} title={m.title} date={m.date} overdue />
            ))}
            {metrics.next.map((m) => (
              <MilestoneRow key={m.id} title={m.title} date={m.date} />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MilestoneRow({ title, date, overdue }: { title: string; date: string; overdue?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2.5 py-2">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</span>
      <Badge variant={overdue ? 'accent' : 'neutral'}>
        {overdue && 'Vencido · '}
        {formatDay(date)}
      </Badge>
    </div>
  );
}
