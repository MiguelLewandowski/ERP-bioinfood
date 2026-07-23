import Link from 'next/link';
import { ArrowRight, ListChecks, UserX } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Badge } from '@/components/ui/badge';
import type { TaskMetrics } from '@/lib/project-metrics';

interface TasksCardProps {
  projectId: string;
  metrics: TaskMetrics;
}

export function TasksCard({ projectId, metrics }: TasksCardProps) {
  const rows: Array<{ label: string; count: number }> = [
    { label: 'A fazer',     count: metrics.todo },
    { label: 'Em andamento', count: metrics.inProgress },
    { label: 'Concluídas',  count: metrics.done },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ListChecks size={15} className="text-primary" /> Tarefas
        </CardTitle>
        <Link
          href={`/projects/${projectId}/kanban`}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver kanban <ArrowRight size={12} />
        </Link>
      </CardHeader>
      <CardContent>
        {metrics.total === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma tarefa cadastrada ainda.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {rows.map(({ label, count }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
                  <ProgressBar
                    value={(count / metrics.total) * 100}
                    label={`${label}: ${count} de ${metrics.total} tarefas`}
                    className="flex-1"
                  />
                  <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </div>

            {metrics.unassigned > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserX size={12} aria-hidden="true" />
                {metrics.unassigned} tarefa{metrics.unassigned > 1 ? 's' : ''} em aberto sem responsável.
              </p>
            )}

            {metrics.byAssignee.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Carga por responsável</p>
                <ul className="flex flex-col gap-1.5">
                  {metrics.byAssignee.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-foreground">{a.name}</span>
                      <Badge variant="neutral">
                        {a.done}/{a.total}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
