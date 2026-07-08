import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from './types';
import { checklistProgress } from './types';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  LOW:      { label: 'Baixa',    color: '#706F6F', bg: '#F3F4F6' },
  MEDIUM:   { label: 'Média',    color: '#C16C06', bg: '#FDC75F' },
  HIGH:     { label: 'Alta',     color: '#156D1D', bg: '#86C175' },
  CRITICAL: { label: 'Crítica',  color: '#FFFFFF', bg: '#147F23' },
};

interface KanbanCardProps {
  task: Task;
  isOverlay?: boolean;
  onEdit?: (task: Task) => void;
}

export function KanbanCard({ task, isOverlay, onEdit }: KanbanCardProps) {
  // `data.status` permite resolver a coluna de destino quando o drop termina
  // em cima de outro card, não no fundo vazio da coluna.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-3 group relative',
        'hover:border-[#52B552] hover:shadow-sm transition-all select-none',
        isDragging && 'opacity-40',
        isOverlay && 'shadow-lg rotate-1 border-[#52B552]',
      )}
    >
      {/* Drag handle area */}
      <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing rounded-lg" />

      {/* Edit button — on top of drag overlay */}
      {onEdit && !isOverlay && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-100 text-[#706F6F] hover:text-[#147F23] transition-all"
          title="Editar tarefa"
        >
          <Pencil size={12} />
        </button>
      )}

      <div className="flex items-start justify-between gap-6 mb-2 relative pointer-events-none">
        <p className="text-sm font-medium text-[#1D1D1B] leading-snug line-clamp-2">{task.title}</p>
        <span
          className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: priority.bg, color: priority.color }}
        >
          {priority.label}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-[#706F6F] line-clamp-2 mb-2 relative pointer-events-none">{task.description}</p>
      )}

      {/* Checklist progress */}
      {task.checklist?.length > 0 && (() => {
        const pct = checklistProgress(task.checklist);
        const done = task.checklist.filter((i) => i.checked).length;
        return (
          <div className="mt-2 relative pointer-events-none">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#706F6F]">{done}/{task.checklist.length} itens</span>
              <span className="text-[10px] font-semibold" style={{ color: pct === 100 ? '#147F23' : '#706F6F' }}>{pct}%</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#46AD48' : '#147F23' }}
              />
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-between mt-2 relative pointer-events-none">
        <div className="flex items-center gap-2">
          {task.storyPoints && (
            <span className="text-xs font-semibold text-[#575756] bg-gray-100 px-1.5 py-0.5 rounded">
              {task.storyPoints} pts
            </span>
          )}
          {task.dueDate && (
            <span className="text-xs text-[#706F6F]">
              {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
        {task.assignee && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: '#147F23' }}
            title={task.assignee.name}
          >
            {task.assignee.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
