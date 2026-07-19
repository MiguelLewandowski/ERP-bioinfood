'use client'; // DnD reorder + status filters

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { BacklogRow } from './backlog-row';
import { TaskFormDialog } from '../../_components/tasks/task-form-dialog';
import type { ProjectMember } from '@/lib/project-members';
import type { TaskDto as Task } from '@bioinfood/shared';

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL',         label: 'Todas' },
  { value: 'TODO',        label: 'A fazer' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'DONE',        label: 'Concluído' },
];

interface BacklogClientProps {
  projectId: string;
  initialTasks: Task[];
  members: ProjectMember[];
}

export function BacklogClient({ projectId, initialTasks, members }: BacklogClientProps) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(
    [...initialTasks.filter((t) => !t.deletedAt)].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
  );
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingTask, setEditingTask]   = useState<Task | null>(null);
  const [creating, setCreating]         = useState(false);

  // Abre o dialog de edição quando chega do calendário via ?task=<id>.
  const searchParams = useSearchParams();
  useEffect(() => {
    const taskId = searchParams.get('task');
    if (!taskId) return;
    const match = tasks.find((t) => t.id === taskId);
    if (match) setEditingTask(match);
    // Depende só do id da URL: reabrir ao navegar de volta com outro task.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const oldIdx = tasks.findIndex((t) => t.id === active.id);
    const newIdx = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIdx, newIdx);
    setTasks(reordered);

    await api.patch(`/projects/${projectId}/tasks/reorder`, { items: reordered.map((t, i) => ({ id: t.id, order: i })) }, token);
  }

  function onTaskCreated(task: Task) {
    setTasks((prev) => [...prev, task]);
  }

  function onTaskUpdated(updated: Task) {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  }

  function onTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  const visible = statusFilter === 'ALL' ? tasks : tasks.filter((t) => t.status === statusFilter);

  const stats = {
    todo: tasks.filter((t) => t.status === 'TODO').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
    points: tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0),
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Backlog</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} itens · {stats.points} story points</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: 'hsl(var(--primary))' }}
        >
          <Plus size={16} /> Nova Tarefa
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'A fazer',      value: stats.todo,       color: 'hsl(var(--muted-foreground))' },
          { label: 'Em andamento', value: stats.inProgress, color: 'hsl(var(--primary))' },
          { label: 'Concluído',    value: stats.done,        color: 'hsl(var(--primary-dark))' },
          { label: 'Story Points', value: stats.points,      color: 'hsl(var(--accent))' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={statusFilter === value
              ? { backgroundColor: 'hsl(var(--primary))', color: 'white' }
              : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_120px_100px_90px_90px_36px] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-muted-foreground">
          <span />
          <span>Tarefa</span>
          <span>Status</span>
          <span>Prioridade</span>
          <span className="text-right">Pts</span>
          <span className="text-right">Prazo</span>
          <span />
        </div>

        {visible.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma tarefa encontrada.</p>
          </div>
        )}

        <DndContext id="backlog-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {visible.map((task) => (
              <BacklogRow key={task.id} task={task} onEdit={setEditingTask} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {creating && (
        <TaskFormDialog
          mode="create"
          projectId={projectId}
          members={members}
          onCreated={onTaskCreated}
          onClose={() => setCreating(false)}
        />
      )}

      {editingTask && (
        <TaskFormDialog
          mode="edit"
          task={editingTask}
          projectId={projectId}
          members={members}
          onUpdated={onTaskUpdated}
          onDeleted={onTaskDeleted}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
