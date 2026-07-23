import Link from 'next/link';
import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { riskBand, type RiskBand, type RiskMetrics } from '@/lib/project-metrics';

const LEVEL_LABELS: Record<string, string> = {
  VERY_LOW: 'Muito Baixo', LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto', VERY_HIGH: 'Muito Alto',
};

// Escala de severidade por token semântico (o âmbar da marca é a cor de alerta).
const BAND_STYLES: Record<RiskBand, string> = {
  critical: 'bg-destructive text-primary-foreground',
  high:     'bg-accent text-primary-foreground',
  medium:   'bg-warning/30 text-accent',
  low:      'bg-success/20 text-primary',
};

interface RisksCardProps {
  projectId: string;
  metrics: RiskMetrics;
}

export function RisksCard({ projectId, metrics }: RisksCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-accent" /> Riscos
        </CardTitle>
        <Link
          href={`/projects/${projectId}/risks`}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver todos <ArrowRight size={12} />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {metrics.total === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhum risco registrado"
            description="Riscos mapeados aparecem aqui, do mais severo para o menos."
            className="py-8"
          />
        ) : (
          metrics.top.map((risk) => (
            <div key={risk.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums',
                  BAND_STYLES[riskBand(risk.score)],
                )}
              >
                {risk.score}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{risk.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {LEVEL_LABELS[risk.probability]} × {LEVEL_LABELS[risk.impact]}
                  {risk.owner && ` · ${risk.owner.name}`}
                </span>
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
