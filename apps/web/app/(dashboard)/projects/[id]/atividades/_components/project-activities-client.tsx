'use client'; // listagem por dia + modal de cadastro

import { useMemo, useState } from 'react';
import { Plus, X, Loader2, CalendarDays } from 'lucide-react';
import type { ActivityDto, TaskDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { tasksApi } from '@/lib/api-hooks';
import { groupByDay, formatDayLabel } from '@/lib/activities';
import { ActivityCard } from '@/components/activities/activity-card';

// Janela ampla: na aba do projeto exibimos todas as atividades datadas.
const FULL_RANGE = { start: new Date(0), end: new Date(8.64e15) };

function taskToActivity(
  task: TaskDto,
  project: { id: string; name: string },
  taskById: Map<string, TaskDto>,
): ActivityDto {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    startDate: task.startDate,
    dueDate: task.dueDate,
    project,
    assignee: task.assignee,
    predecessors: task.predecessors
      .map((dep) => taskById.get(dep.predecessorId))
      .filter((t): t is TaskDto => Boolean(t))
      .map((t) => ({ id: t.id, title: t.title, status: t.status })),
  };
}

interface Props {
  projectId: string;
  projectName: string;
  members: Array<{ id: string; name: string }>;
  initialTasks: TaskDto[];
}

export function ProjectActivitiesClient({ projectId, projectName, members, initialTasks }: Props) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<TaskDto[]>(initialTasks);
  const [open, setOpen] = useState(false);

  const project = { id: projectId, name: projectName };

  const blocks = useMemo(() => {
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    const activities = tasks.map((t) => taskToActivity(t, project, taskById));
    return groupByDay(activities, FULL_RANGE);
  }, [tasks, projectId, projectName]);

  async function refresh() {
    const fresh = await tasksApi.list(projectId, token);
    setTasks(fresh);
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1D1D1B]">Atividades</h1>
          <p className="text-sm text-[#706F6F]">Atividades datadas deste projeto, por dia</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
          style={{ backgroundColor: '#147F23' }}
        >
          <Plus size={14} /> Nova atividade
        </button>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-sm text-[#878787]">
          Nenhuma atividade datada ainda. Clique em “Nova atividade” para cadastrar.
        </div>
      ) : (
        <div className="space-y-6">
          {blocks.map((block) => (
            <section key={block.key}>
              <div className="mb-2 flex items-center gap-2">
                <CalendarDays size={14} className="text-[#147F23]" />
                <h2 className="text-sm font-bold capitalize text-[#1D1D1B]">
                  {formatDayLabel(block.date)}
                </h2>
                <span className="text-xs text-[#878787]">
                  {block.activities.length} {block.activities.length === 1 ? 'atividade' : 'atividades'}
                </span>
              </div>
              <div className="space-y-2">
                {block.activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} showProject={false} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {open && (
        <NewActivityModal
          projectId={projectId}
          members={members}
          predecessorOptions={tasks}
          token={token}
          onClose={() => setOpen(false)}
          onCreated={async () => {
            setOpen(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

interface ModalProps {
  projectId: string;
  members: Array<{ id: string; name: string }>;
  predecessorOptions: TaskDto[];
  token: string;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

function NewActivityModal({
  projectId, members, predecessorOptions, token, onClose, onCreated,
}: ModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [predecessorId, setPredecessorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length > 0 && date.length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const startDate = new Date(`${date}T${time || '00:00'}:00`).toISOString();
      const created = await tasksApi.create(
        projectId,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          assigneeId: assigneeId || undefined,
          startDate,
          status: 'TODO',
        },
        token,
      );
      // Atrela a antecessora, se informada (a nova atividade é a sucessora).
      if (predecessorId) {
        await tasksApi.addDependency(projectId, created.id, predecessorId, token);
      }
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar atividade');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-sm font-bold text-[#1D1D1B]">Nova atividade</h3>
          <button onClick={onClose} className="text-[#878787] hover:text-[#1D1D1B]">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#1D1D1B]">Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Ex: Coleta de amostras no biorreator"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-[#52B552] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#1D1D1B]">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Detalhes da atividade…"
              className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-[#52B552] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1D1D1B]">Data *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-[#52B552] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1D1D1B]">Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-[#52B552] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#1D1D1B]">Responsável</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-[#52B552] focus:bg-white focus:outline-none"
            >
              <option value="">— Sem responsável —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#1D1D1B]">
              Atividade antecessora
            </label>
            <select
              value={predecessorId}
              onChange={(e) => setPredecessorId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-[#52B552] focus:bg-white focus:outline-none"
            >
              <option value="">— Nenhuma —</option>
              {predecessorOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            {predecessorId && (
              <p className="mt-1 text-[11px] text-[#878787]">
                Esta atividade só poderá iniciar quando a antecessora estiver concluída.
              </p>
            )}
          </div>

          {error && <p className="text-xs text-[#D64550]">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#575756] hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#147F23' }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
