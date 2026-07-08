'use client';

import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, User } from 'lucide-react';
import type { OpportunityDto } from '@bioinfood/shared';

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
      className={`rounded-lg border border-gray-200 bg-white p-3 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isOverlay ? 'shadow-lg' : 'hover:border-[#52B552]'} transition-colors`}
    >
      <p className="text-sm font-medium text-[#1D1D1B] leading-snug">{opportunity.title}</p>
      <div className="mt-2 flex items-center gap-1 text-xs text-[#706F6F]">
        <Building2 size={12} />
        {isOverlay ? (
          <span className="truncate">{org}</span>
        ) : (
          <Link
            href={`/clientes/${opportunity.organization.id}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate hover:text-[#147F23] hover:underline"
          >
            {org}
          </Link>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#147F23]">{formatBRL(opportunity.amount, opportunity.currency)}</span>
        {opportunity.probability !== null && (
          <span className="text-[11px] text-[#878787]">{opportunity.probability}%</span>
        )}
      </div>
      {opportunity.responsible && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#878787]">
          <User size={11} /> {opportunity.responsible.name}
        </div>
      )}
    </div>
  );
}
