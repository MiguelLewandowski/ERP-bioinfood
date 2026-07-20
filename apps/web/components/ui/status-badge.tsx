import { Badge, type BadgeProps } from '@/components/ui/badge';

// Mapa central status → rótulo + variante. Toda tela que mostra status de
// entidade usa este componente — nunca redefinir cores de status localmente.
// Novos status entram AQUI (fallback: neutral com o valor cru).
const STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  // Projetos
  PLANNING: { label: 'Planejamento', variant: 'neutral' },
  IN_PROGRESS: { label: 'Em andamento', variant: 'success' },
  ON_HOLD: { label: 'Pausado', variant: 'warning' },
  COMPLETED: { label: 'Concluído', variant: 'success' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  // Atividades / tarefas
  TODO: { label: 'A fazer', variant: 'neutral' },
  PENDING: { label: 'Pendente', variant: 'neutral' },
  DONE: { label: 'Concluída', variant: 'success' },
  // Organizações / genéricos
  ACTIVE: { label: 'Ativo', variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'neutral' },
  ARCHIVED: { label: 'Arquivado', variant: 'neutral' },
};

interface StatusBadgeProps {
  status: string;
  /** Sobrescreve o rótulo do mapa (ex.: "Ativa" no feminino). */
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const entry = STATUS_MAP[status] ?? { label: status, variant: 'neutral' as const };
  return (
    <Badge variant={entry.variant} className={className}>
      {label ?? entry.label}
    </Badge>
  );
}
