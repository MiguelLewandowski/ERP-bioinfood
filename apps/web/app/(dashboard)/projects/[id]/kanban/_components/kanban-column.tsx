import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  count: number;
  children: React.ReactNode;
}

export function KanbanColumn({ id, label, color, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl border-2 p-3 min-h-[400px] transition-colors',
        isOver ? 'border-[#52B552] bg-[#86C175]/10' : 'border-gray-200 bg-gray-50',
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-[#1D1D1B]">{label}</span>
        </div>
        <span className="text-xs font-medium text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: color }}>
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
