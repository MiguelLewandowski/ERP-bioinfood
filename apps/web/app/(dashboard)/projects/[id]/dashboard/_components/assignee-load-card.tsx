import { Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import type { AssigneeLoad } from '@/lib/project-metrics';

interface AssigneeLoadCardProps {
  loads: AssigneeLoad[];
}

/**
 * Ordena por MENOR progresso. `computeTaskMetrics` devolve `byAssignee` ordenado
 * por volume (`total` desc), que responde "quem tem mais tarefas" — pergunta
 * diferente de "quem está mais atrás", que é a que interessa a quem abre o
 * dashboard para decidir onde ajudar.
 *
 * A ordenação mora aqui, e não em `lib/project-metrics.ts`, porque aquele módulo
 * é compartilhado por outras telas — mudar a ordem lá mudaria todas elas.
 * Empate de progresso resolvido por volume, para a ordem ser estável.
 */
function byLowestProgress(loads: AssigneeLoad[]): AssigneeLoad[] {
  return [...loads].sort((a, b) => (a.done / a.total) - (b.done / b.total) || b.total - a.total);
}

export function AssigneeLoadCard({ loads }: AssigneeLoadCardProps) {
  const ordered = byLowestProgress(loads);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users size={15} className="text-primary" /> Carga por responsável
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma tarefa atribuída ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ordered.map((a) => {
              const pct = Math.round((a.done / a.total) * 100);
              return (
                <li key={a.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm text-foreground">{a.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {a.done}/{a.total}
                    </span>
                  </div>
                  <ProgressBar value={pct} label={`${a.name}: ${a.done} de ${a.total} tarefas concluídas`} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
