'use client';

import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, User, Snowflake } from 'lucide-react';
import type { OpportunityDto } from '@bioinfood/shared';
import { cn } from '@/lib/utils';

export function formatBRL(amount: string | null, currency = 'BRL'): string {
  if (amount === null) return '—';
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(n);
}

interface CrmCardProps {
  opportunity: OpportunityDto;
  onEdit?: (o: OpportunityDto) => void;
  isOverlay?: boolean;
  draggable?: boolean;
}

export function CrmCard({ opportunity, onEdit, isOverlay, draggable = true }: CrmCardProps) {
  const sortable = useSortable({
    id: opportunity.id,
    data: { stageId: opportunity.stageId },
    disabled: !draggable,
  });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
  };
  const org = opportunity.organization.tradeName ?? opportunity.organization.legalName;

  return (
    <div
      ref={draggable ? sortable.setNodeRef : undefined}
      style={draggable ? style : undefined}
      {...(draggable ? sortable.attributes : {})}
      {...(draggable ? sortable.listeners : {})}
      onClick={() => onEdit?.(opportunity)}
      className={cn(
        'rounded-lg border border-border bg-card p-3 transition-colors',
        draggable && 'cursor-grab active:cursor-grabbing',
        isOverlay ? 'shadow-lg' : 'hover:border-ring',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium leading-snug text-foreground">{opportunity.title}</p>
        {opportunity.frozenAt && (
          <Snowflake size={13} className="mt-0.5 shrink-0 text-blue-500" aria-label="Congelado" />
        )}
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Building2 size={12} />
        {isOverlay ? (
          <span className="truncate">{org}</span>
        ) : (
          <Link
            href={`/clientes/${opportunity.organization.id}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate hover:text-primary hover:underline"
          >
            {org}
          </Link>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">
          {formatBRL(opportunity.amount, opportunity.currency)}
        </span>
        {opportunity.probability !== null && (
          <span className="text-[11px] text-muted-foreground">{opportunity.probability}%</span>
        )}
      </div>
      {opportunity.responsible && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <User size={11} /> {opportunity.responsible.name}
        </div>
      )}
    </div>
  );
}
