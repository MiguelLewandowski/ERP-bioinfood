import Link from 'next/link';
import { ArrowRight, ListChecks, UserX } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TaskMetrics } from '@/lib/project-metrics';

interface TasksCardProps {
  projectId: string;
  metrics: TaskMetrics;
}

// Mesma semântica de cor do Gantt (`gantt-status.css`): cinza a fazer, âmbar em
// andamento, verde concluída. Divergir aqui faria a mesma tarefa mudar de cor
// entre duas telas do mesmo projeto.
//
// Ordem: concluídas à esquerda — a barra lê como progresso enchendo, não como
// três categorias soltas.
const SEGMENTS = [
  { key: 'done',       label: 'Concluídas',   className: 'bg-success' },
  { key: 'inProgress', label: 'Em andamento', className: 'bg-warning' },
  { key: 'todo',       label: 'A fazer',      className: 'bg-muted-foreground/30' },
] as const;

export function TasksCard({ projectId, metrics }: TasksCardProps) {
  const segments = SEGMENTS.map((s) => ({ ...s, count: metrics[s.key] }));
  const summary = segments.map((s) => `${s.label}: ${s.count}`).join(', ');

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
            {/* Uma barra empilhada em vez de três trilhos: três barras de mesma
                largura com valores próximos liam como se não fossem proporcionais,
                mesmo estando certas. Empilhar tira a comparação do olho. */}
            <div
              role="img"
              aria-label={`${metrics.total} tarefas — ${summary}`}
              className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
            >
              {segments.map(({ key, count, className }) => (
                count > 0 && (
                  <div
                    key={key}
                    className={cn('h-full', className)}
                    style={{ width: `${(count / metrics.total) * 100}%` }}
                  />
                )
              ))}
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {segments.map(({ key, label, count, className }) => (
                <li key={key} className="flex items-center gap-1.5 text-xs">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', className)} aria-hidden="true" />
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold tabular-nums text-foreground">{count}</span>
                </li>
              ))}
            </ul>

            {metrics.unassigned > 0 && (
              // Clicável: saber que há trabalho sem dono só serve se der para ver
              // qual. O backlog lê `?assignee=none`.
              <Link
                href={`/projects/${projectId}/backlog?assignee=none`}
                className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                <UserX size={12} aria-hidden="true" />
                {metrics.unassigned} tarefa{metrics.unassigned > 1 ? 's' : ''} em aberto sem responsável.
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
