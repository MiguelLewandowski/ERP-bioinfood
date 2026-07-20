'use client';

import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Building2, User, Snowflake, AlertTriangle, Clock, CheckCircle2,
} from 'lucide-react';
import type { CrmActivityDto, OpportunityDto } from '@bioinfood/shared';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/lib/crm-tasks';

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
  // Tarefa mais urgente vinculada a este negócio (atrasada tem prioridade sobre
  // a de hoje) — sinaliza no card sem precisar abrir o modal (achado #1 da
  // análise de UI/UX 2026-07-18).
  urgentTask?: CrmActivityDto | null;
  onCompleteTask?: (taskId: string) => void;
}

export function CrmCard({
  opportunity, onEdit, isOverlay, draggable = true, urgentTask, onCompleteTask,
}: CrmCardProps) {
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
            href={`/crm/empresas/${opportunity.organization.id}`}
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
      {urgentTask && (() => {
        const overdue = isOverdue(urgentTask.dueDate);
        return (
          <div
            className={cn(
              'mt-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px]',
              overdue ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent',
            )}
          >
            {overdue ? <AlertTriangle size={11} className="shrink-0" /> : <Clock size={11} className="shrink-0" />}
            <span className="min-w-0 flex-1 truncate">{urgentTask.title}</span>
            {onCompleteTask && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCompleteTask(urgentTask.id); }}
                className="shrink-0 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Concluir tarefa"
                title="Concluir tarefa"
              >
                <CheckCircle2 size={13} />
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
