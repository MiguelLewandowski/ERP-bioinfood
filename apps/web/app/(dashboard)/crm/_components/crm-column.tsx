'use client';

import { useDroppable } from '@dnd-kit/core';
import type { StageDto } from '@bioinfood/shared';
import { cn } from '@/lib/utils';
import { formatBRL } from './crm-card';

interface CrmColumnProps {
  stage: StageDto;
  count: number;
  amount: string;
  children: React.ReactNode;
}

export function CrmColumn({ stage, count, amount, children }: CrmColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { stageId: stage.id, stageType: stage.type },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl border bg-muted/40',
        isOver ? 'border-ring bg-success/10' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {/* Cor da etapa é dado configurável do usuário, não token do tema. */}
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground"
            style={stage.color ? { backgroundColor: stage.color } : undefined}
          />
          <span className="truncate text-xs font-semibold text-foreground">{stage.name}</span>
          <span className="text-[11px] text-muted-foreground">{count}</span>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{formatBRL(amount)}</span>
      </div>
      <div className="flex min-h-[120px] flex-col gap-2 p-2">{children}</div>
    </div>
  );
}
