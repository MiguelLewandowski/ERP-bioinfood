import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskDto as Task } from '@bioinfood/shared';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  TODO:        { label: 'A fazer',       color: 'hsl(var(--muted-foreground))' },
  IN_PROGRESS: { label: 'Em andamento',  color: 'hsl(var(--primary))' },
  DONE:        { label: 'Concluído',     color: '#46AD48' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  LOW:      { label: 'Baixa',   color: 'hsl(var(--muted-foreground))', bg: '#F3F4F6' },
  MEDIUM:   { label: 'Média',   color: 'hsl(var(--accent))', bg: '#FDC75F' },
  HIGH:     { label: 'Alta',    color: 'hsl(var(--primary-dark))', bg: '#86C175' },
  CRITICAL: { label: 'Crítica', color: 'white', bg: '#147F23' },
};

interface BacklogRowProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export function BacklogRow({ task, onEdit }: BacklogRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const status = STATUS_CONFIG[task.status];
  const priority = PRIORITY_CONFIG[task.priority];

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
      <span className="text-xs font-medium" style={{ color: status.color }}>{status.label}</span>
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded w-fit"
        style={{ backgroundColor: priority.bg, color: priority.color }}
      >
        {priority.label}
      </span>
      <span className="text-sm font-semibold text-right text-muted-foreground">{task.storyPoints ?? '—'}</span>
      <span className="text-xs text-right text-muted-foreground">
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
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
