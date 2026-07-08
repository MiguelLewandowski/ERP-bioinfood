'use client';

import { useDroppable } from '@dnd-kit/core';
import type { StageDto } from '@bioinfood/shared';
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
  const color = stage.color ?? '#575756';

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border bg-gray-50/60 ${isOver ? 'border-[#52B552] bg-[#86C175]/10' : 'border-gray-200'}`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs font-semibold text-[#1D1D1B] truncate">{stage.name}</span>
          <span className="text-[11px] text-[#878787]">{count}</span>
        </div>
        <span className="text-[11px] font-medium text-[#575756] shrink-0">{formatBRL(amount)}</span>
      </div>
      <div className="flex flex-col gap-2 p-2 min-h-[120px]">{children}</div>
    </div>
  );
}
