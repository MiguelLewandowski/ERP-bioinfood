import { Badge, type BadgeProps } from '@/components/ui/badge';

// Mapa central de prioridade → rótulo + variante. Toda tela que mostra
// prioridade de task usa este componente — nunca redefinir cores localmente.
const PRIORITY_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  LOW: { label: 'Baixa', variant: 'neutral' },
  MEDIUM: { label: 'Média', variant: 'success' },
  HIGH: { label: 'Alta', variant: 'accent' },
  CRITICAL: { label: 'Crítica', variant: 'destructive' },
};

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const entry = PRIORITY_MAP[priority] ?? { label: priority, variant: 'neutral' as const };
  return (
    <Badge variant={entry.variant} className={className}>
      {entry.label}
    </Badge>
  );
}
