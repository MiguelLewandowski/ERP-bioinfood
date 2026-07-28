import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDay } from '@/lib/dates';
import { PriorityBadge } from '@/components/ui/priority-badge';
import type { Task } from './types';
import { checklistProgress } from './types';

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-3 group relative',
        'hover:border-ring hover:shadow-sm transition-all select-none',
        isDragging && 'opacity-40',
        isOverlay && 'shadow-lg rotate-1 border-ring',
      )}
    >
      {/* Drag handle area */}
      <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing rounded-lg" />

      {/* Edit button — on top of drag overlay */}
      {onEdit && !isOverlay && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-100 text-muted-foreground hover:text-primary transition-all"
          title="Editar tarefa"
        >
          <Pencil size={12} />
        </button>
      )}

      <div className="flex items-start justify-between gap-6 mb-2 relative pointer-events-none">
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{task.title}</p>
        <PriorityBadge priority={task.priority} className="shrink-0" />
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 relative pointer-events-none">{task.description}</p>
      )}

      {/* Checklist progress */}
      {task.checklist?.length > 0 && (() => {
        const pct = checklistProgress(task.checklist);
        const done = task.checklist.filter((i) => i.checked).length;
        return (
          <div className="mt-2 relative pointer-events-none">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{done}/{task.checklist.length} itens</span>
              <span className="text-[10px] font-semibold" style={{ color: pct === 100 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>{pct}%</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: pct === 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))' }}
              />
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-between mt-2 relative pointer-events-none">
        <div className="flex items-center gap-2">
          {task.storyPoints && (
            <span className="text-xs font-semibold text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
              {task.storyPoints} pts
            </span>
          )}
          {task.dueDate && (
            <span className="text-xs text-muted-foreground">
              {formatDay(task.dueDate)}
            </span>
          )}
        </div>
        {task.assignee && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
            title={task.assignee.name}
          >
            {task.assignee.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
