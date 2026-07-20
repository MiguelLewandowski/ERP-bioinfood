import type { CrmActivityType } from '@bioinfood/shared';
import { Badge } from '@/components/ui/badge';
import { ACTIVITY_TYPE_LABELS } from '@/lib/crm-tasks';

interface ActivityTypeBadgeProps {
  type: CrmActivityType;
  className?: string;
}

/** Tipo de atividade de CRM (Nota, Ligação, Proposta…) como Badge do sistema. */
export function ActivityTypeBadge({ type, className }: ActivityTypeBadgeProps) {
  return (
    <Badge variant="outline" className={className}>
      {ACTIVITY_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}
