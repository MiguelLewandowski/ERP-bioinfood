'use client'; // DnD requires client interaction

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { TaskFormDialog } from '../../_components/tasks/task-form-dialog';
import type { ProjectMember } from '@/lib/project-members';
import type { Task } from './types';

const COLUMNS = [
  { id: 'TODO',        label: 'A fazer',      color: '#575756' },
  { id: 'IN_PROGRESS', label: 'Em andamento', color: '#147F23' },
  { id: 'DONE',        label: 'Concluído',    color: '#46AD48' },
] as const;

interface KanbanClientProps {
  projectId: string;
  initialTasks: Task[];
  members: ProjectMember[];
}

export function KanbanClient({ projectId, initialTasks, members }: KanbanClientProps) {
  const { token } = useAuth();
  const [tasks, setTasks]           = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [creating, setCreating]       = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function onDragStart({ active }: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === active.id) ?? null);
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    // Soltar em cima de um card (não do fundo da coluna) faz over.id virar o id
    // da tarefa sob o cursor — o status real da coluna vem de over.data.current.
    const overData  = over.data.current as { status?: Task['status'] } | undefined;
    const newStatus = (overData?.status ?? over.id) as Task['status'];
    const task      = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const oldStatus = task.status;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await api.patch(`/projects/${projectId}/tasks/${taskId}`, { status: newStatus }, token);
    } catch (err) {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: oldStatus } : t));
      toast.error(getErrorMessage(err));
    }
  }

  function onTaskCreated(task: Task) { setTasks((prev) => [...prev, task]); }
  function onTaskUpdated(updated: Task) { setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t)); }
  function onTaskDeleted(taskId: string) { setTasks((prev) => prev.filter((t) => t.id !== taskId)); }

  const tasksByStatus = (status: string) => tasks.filter((t) => t.status === status && !t.deletedAt);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1B]">Kanban</h2>
          <p className="text-sm text-[#706F6F] mt-0.5">{tasks.filter((t) => !t.deletedAt).length} tarefas</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: '#147F23' }}
        >
          <Plus size={16} /> Nova Tarefa
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-3 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus(col.id);
            return (
              <KanbanColumn key={col.id} id={col.id} label={col.label} color={col.color} count={colTasks.length}>
                <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {colTasks.map((task) => (
                    <KanbanCard key={task.id} task={task} onEdit={setEditingTask} />
                  ))}
                </SortableContext>
              </KanbanColumn>
            );
          })}
        </div>
        <DragOverlay>
          {activeTask && <KanbanCard task={activeTask} isOverlay />}
        </DragOverlay>
      </DndContext>

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
