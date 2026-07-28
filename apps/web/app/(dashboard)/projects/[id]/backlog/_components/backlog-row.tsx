import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDay } from '@/lib/dates';
import type { TaskDto as Task } from '@bioinfood/shared';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';

interface BacklogRowProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export function BacklogRow({ task, onEdit }: BacklogRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'grid grid-cols-[auto_1fr_120px_100px_90px_90px_36px] gap-4 px-4 py-3 border-b border-gray-100 items-center group',
        'hover:bg-gray-50 transition-colors',
        isDragging && 'opacity-40 bg-success/10',
      )}
    >
      <button {...attributes} {...listeners} className="text-gray-400 hover:text-muted-foreground cursor-grab active:cursor-grabbing">
        <GripVertical size={14} />
      </button>
      <div>
        <p className="text-sm font-medium text-foreground leading-snug">{task.title}</p>
        {task.description && <p className="text-xs text-muted-foreground truncate max-w-sm">{task.description}</p>}
      </div>
      <StatusBadge status={task.status} className="w-fit" />
      <PriorityBadge priority={task.priority} className="w-fit" />
      <span className="text-sm font-semibold text-right text-muted-foreground">{task.storyPoints ?? '—'}</span>
      <span className="text-xs text-right text-muted-foreground">
        {task.dueDate ? formatDay(task.dueDate) : '—'}
      </span>
      <button
        onClick={() => onEdit(task)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-gray-200 text-muted-foreground hover:text-primary transition-all"
        title="Editar tarefa"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}
