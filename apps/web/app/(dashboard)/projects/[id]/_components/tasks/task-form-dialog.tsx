'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { X, Trash2, AlertTriangle, Link2, Plus, ArrowRight, CheckSquare, Square, ListChecks } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import type { ProjectMember } from '@/lib/project-members';
import type { TaskDto as Task, TaskChecklistItemDto as TaskChecklistItem } from '@bioinfood/shared';
import { checklistProgress } from '@bioinfood/shared';

const schema = z
  .object({
    title:       z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
    description: z.string().max(2000, 'Descrição deve ter no máximo 2000 caracteres').optional(),
    status:      z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    assigneeId:  z.string().optional(),
    storyPoints: z.coerce.number().int().min(1, 'Mínimo 1').max(100, 'Máximo 100').optional().or(z.literal('')),
    // Input date="" quando vazio — mantém string aqui e normaliza pra undefined no onSubmit,
    // nunca envia "" pro backend (que rejeitaria com @IsDateString()).
    startDate:   z.string().optional(),
    dueDate:     z.string().optional(),
    // Hora é opcional e só se aplica quando a data correspondente está preenchida.
    startTime:   z.string().optional(),
    endTime:     z.string().optional(),
  })
  .refine((data) => !data.startDate || !data.dueDate || data.dueDate >= data.startDate, {
    message: 'O prazo não pode ser anterior à data de início',
    path: ['dueDate'],
  })
  .refine((data) => {
    if (!data.startDate || !data.dueDate || data.startDate !== data.dueDate) return true;
    if (!data.startTime || !data.endTime) return true;
    return data.endTime >= data.startTime;
  }, {
    message: 'A hora final não pode ser anterior à hora de início',
    path: ['endTime'],
  });

type FormValues = z.infer<typeof schema>;

function toDateInput(d: string | null | undefined): string {
  if (!d) return '';
  return d.split('T')[0];
}

// '00:00' é o sentinel de "sem hora definida" (mesma regra de apps/web/lib/activities.ts formatTime).
function toTimeInput(d: string | null | undefined): string {
  if (!d) return '';
  const time = new Date(d).toTimeString().slice(0, 5);
  return time === '00:00' ? '' : time;
}

function combineDateTime(date: string, time: string | undefined): string {
  return new Date(`${date}T${time || '00:00'}:00`).toISOString();
}

interface TaskFormDialogProps {
  projectId: string;
  members: ProjectMember[];
  mode: 'create' | 'edit';
  task?: Task;
  onClose: () => void;
  onCreated?: (task: Task) => void;
  onUpdated?: (task: Task) => void;
  onDeleted?: (taskId: string) => void;
}

export function TaskFormDialog({ projectId, members, mode, task, onClose, onCreated, onUpdated, onDeleted }: TaskFormDialogProps) {
  const { token } = useAuth();
  const isEdit = mode === 'edit' && !!task;

  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError]           = useState('');

  // Dependencies (edição apenas — depende da task já existir)
  const [allTasks, setAllTasks]         = useState<Task[]>([]);
  const [predecessors, setPredecessors] = useState(task?.predecessors ?? []);
  const [addingDep, setAddingDep]       = useState(false);
  const [selectedPred, setSelectedPred] = useState('');
  const [depLoading, setDepLoading]     = useState(false);

  // Checklist (edição apenas)
  const [checklist, setChecklist]     = useState<TaskChecklistItem[]>(task?.checklist ?? []);
  const [newItemText, setNewItemText] = useState('');
  const [addingItem, setAddingItem]   = useState(false);
  const newItemRef                    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEdit) return;
    api.get<Task[]>(`/projects/${projectId}/tasks`, token)
      .then((data) => setAllTasks(data.filter((t) => t.id !== task!.id && !t.deletedAt)))
      .catch(() => {});
  }, [isEdit, projectId, token, task]);

  useEffect(() => {
    if (addingItem) newItemRef.current?.focus();
  }, [addingItem]);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          title:       task!.title,
          description: task!.description ?? '',
          status:      task!.status,
          priority:    task!.priority,
          assigneeId:  task!.assignee?.id ?? '',
          storyPoints: task!.storyPoints ?? ('' as unknown as number),
          startDate:   toDateInput(task!.startDate),
          dueDate:     toDateInput(task!.dueDate),
          startTime:   toTimeInput(task!.startDate),
          endTime:     toTimeInput(task!.dueDate),
        }
      : { priority: 'MEDIUM' },
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    setError('');
    try {
      const payload = {
        title:       values.title,
        description: values.description || undefined,
        priority:    values.priority,
        assigneeId:  values.assigneeId || undefined,
        storyPoints: values.storyPoints === '' ? undefined : values.storyPoints,
        startDate:   values.startDate ? combineDateTime(values.startDate, values.startTime) : undefined,
        dueDate:     values.dueDate ? combineDateTime(values.dueDate, values.endTime) : undefined,
        ...(isEdit ? { status: values.status } : {}),
      };

      if (isEdit) {
        const updated = await api.patch<Task>(`/projects/${projectId}/tasks/${task!.id}`, payload, token);
        onUpdated?.({ ...updated, predecessors, checklist });
      } else {
        const created = await api.post<Task>(`/projects/${projectId}/tasks`, payload, token);
        onCreated?.(created);
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${projectId}/tasks/${task!.id}`, token);
      onDeleted?.(task!.id);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  // ── Dependencies ────────────────────────────────────────────────────────────

  async function addDependency() {
    if (!selectedPred || !isEdit) return;
    setDepLoading(true);
    try {
      const dep = await api.post(
        `/projects/${projectId}/tasks/${task!.id}/dependencies`,
        { predecessorId: selectedPred },
        token,
      );
      const next = [...predecessors, dep as (typeof predecessors)[number]];
      setPredecessors(next);
      setSelectedPred('');
      setAddingDep(false);
      // Já persistida — não depende do botão "Salvar". Avisa quem renderiza a
      // tarefa (Gantt/Kanban/Backlog) para refletir a mudança imediatamente.
      onUpdated?.({ ...task!, predecessors: next, checklist });
      toast.success('Dependência adicionada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDepLoading(false);
    }
  }

  async function removeDependency(depId: string) {
    if (!isEdit) return;
    try {
      await api.delete(`/projects/${projectId}/tasks/${task!.id}/dependencies/${depId}`, token);
      const next = predecessors.filter((d) => d.id !== depId);
      setPredecessors(next);
      onUpdated?.({ ...task!, predecessors: next, checklist });
      toast.success('Dependência removida');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  // ── Checklist ───────────────────────────────────────────────────────────────

  async function addChecklistItem() {
    if (!newItemText.trim() || !isEdit) return;
    try {
      const item = await api.post<TaskChecklistItem>(
        `/projects/${projectId}/tasks/${task!.id}/checklist`,
        { text: newItemText.trim() },
        token,
      );
      setChecklist((prev) => [...prev, item]);
      setNewItemText('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function toggleChecklistItem(item: TaskChecklistItem) {
    const updated = { ...item, checked: !item.checked };
    setChecklist((prev) => prev.map((i) => i.id === item.id ? updated : i));
    api.patch(
      `/projects/${projectId}/tasks/${task!.id}/checklist/${item.id}`,
      { checked: updated.checked },
      token,
    ).catch((err) => {
      setChecklist((prev) => prev.map((i) => i.id === item.id ? item : i));
      toast.error(getErrorMessage(err));
    });
  }

  async function deleteChecklistItem(itemId: string) {
    const removed = checklist.find((i) => i.id === itemId);
    setChecklist((prev) => prev.filter((i) => i.id !== itemId));
    api.delete(`/projects/${projectId}/tasks/${task!.id}/checklist/${itemId}`, token).catch((err) => {
      if (removed) setChecklist((prev) => [...prev, removed]);
      toast.error(getErrorMessage(err));
    });
  }

  async function renameChecklistItem(item: TaskChecklistItem, text: string) {
    if (!text.trim() || text === item.text || !isEdit) return;
    try {
      await api.patch(`/projects/${projectId}/tasks/${task!.id}/checklist/${item.id}`, { text }, token);
      setChecklist((prev) => prev.map((i) => i.id === item.id ? { ...i, text } : i));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const progress = checklistProgress(checklist);
  const predecessorTaskMap = new Map(allTasks.map((t) => [t.id, t]));
  const alreadyLinkedIds   = new Set(predecessors.map((p) => p.predecessorId));
  const availableToLink    = allTasks.filter((t) => !alreadyLinkedIds.has(t.id));

  return (
    <div className="fixed inset-0 z-50 flex">
      <button className="flex-1 bg-black/30" onClick={onClose} aria-label="Fechar" />
      <div className="w-[460px] bg-white shadow-2xl flex flex-col h-full">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-[#1D1D1B]">{isEdit ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
          <button onClick={onClose} className="text-[#706F6F] hover:text-[#1D1D1B] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* ── Campos principais ── */}
            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Título *</label>
              <input
                {...register('title')}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
                placeholder="Título da tarefa"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Descrição</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none resize-none"
                placeholder="Detalhes opcionais…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {isEdit && (
                <div>
                  <label className="block text-xs font-semibold text-[#575756] mb-1">Status</label>
                  <select
                    {...register('status')}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none bg-white"
                  >
                    <option value="TODO">A fazer</option>
                    <option value="IN_PROGRESS">Em andamento</option>
                    <option value="DONE">Concluído</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#575756] mb-1">Prioridade</label>
                <select
                  {...register('priority')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none bg-white"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Responsável</label>
              <select
                {...register('assigneeId')}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none bg-white"
              >
                <option value="">— Sem responsável —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Story Points</label>
              <input
                {...register('storyPoints')}
                type="number"
                min={1}
                max={100}
                placeholder="Esforço relativo, opcional"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#575756] mb-1">Data de Início</label>
                <input {...register('startDate')} type="date" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#575756] mb-1">Hora de Início</label>
                <input {...register('startTime')} type="time" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#575756] mb-1">Prazo</label>
                <input {...register('dueDate')} type="date" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none" />
                {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#575756] mb-1">Hora Final</label>
                <input {...register('endTime')} type="time" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none" />
                {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime.message}</p>}
              </div>
            </div>
            <p className="text-[11px] text-[#878787] -mt-3">Preencha início e prazo para aparecer no Gantt. Hora é opcional.</p>

            {isEdit && (
              <>
                {/* ── Checklist ── */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ListChecks size={14} className="text-[#147F23]" />
                      <span className="text-xs font-bold text-[#1D1D1B]">Checklist</span>
                      {checklist.length > 0 && (
                        <span className="text-[10px] font-semibold text-[#575756]">
                          {checklist.filter((i) => i.checked).length}/{checklist.length}
                        </span>
                      )}
                    </div>
                    {checklist.length > 0 && (
                      <span className="text-xs font-bold" style={{ color: progress === 100 ? '#147F23' : '#575756' }}>
                        {progress}%
                      </span>
                    )}
                  </div>

                  {checklist.length > 0 && (
                    <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: progress === 100 ? '#46AD48' : '#147F23',
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-1 mb-2">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 group rounded-lg px-2 py-1 hover:bg-gray-50"
                      >
                        <button
                          type="button"
                          onClick={() => toggleChecklistItem(item)}
                          className="shrink-0 text-[#706F6F] hover:text-[#147F23] transition-colors"
                        >
                          {item.checked
                            ? <CheckSquare size={16} style={{ color: '#147F23' }} />
                            : <Square size={16} />}
                        </button>
                        <input
                          defaultValue={item.text}
                          onBlur={(e) => renameChecklistItem(item, e.target.value)}
                          className={`flex-1 text-sm bg-transparent focus:outline-none focus:bg-white focus:border-b focus:border-[#52B552] transition-colors ${
                            item.checked ? 'line-through text-[#878787]' : 'text-[#1D1D1B]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => deleteChecklistItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#878787] hover:text-red-500 transition-all shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {addingItem ? (
                    <div className="flex gap-2 items-center mt-1">
                      <input
                        ref={newItemRef}
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); }
                          if (e.key === 'Escape') { setAddingItem(false); setNewItemText(''); }
                        }}
                        placeholder="Descreva o item…"
                        className="flex-1 text-sm px-3 py-1.5 border border-[#52B552] rounded-lg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={addChecklistItem}
                        disabled={!newItemText.trim()}
                        className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                        style={{ backgroundColor: '#147F23' }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingItem(false); setNewItemText(''); }}
                        className="text-[#706F6F]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingItem(true)}
                      className="flex items-center gap-1.5 text-xs text-[#706F6F] hover:text-[#147F23] transition-colors mt-1"
                    >
                      <Plus size={13} /> Adicionar item
                    </button>
                  )}
                </div>

                {/* ── Dependências ── */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Link2 size={13} className="text-[#147F23]" />
                      <span className="text-xs font-bold text-[#1D1D1B]">Dependências</span>
                      <span className="text-[10px] text-[#878787]">(começa após…)</span>
                    </div>
                    {!addingDep && availableToLink.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAddingDep(true)}
                        className="flex items-center gap-1 text-xs text-[#147F23] font-semibold hover:underline"
                      >
                        <Plus size={12} /> Adicionar
                      </button>
                    )}
                  </div>

                  {predecessors.length === 0 && !addingDep && (
                    <p className="text-xs text-[#878787] py-1">Nenhuma dependência.</p>
                  )}

                  <div className="space-y-1.5">
                    {predecessors.map((dep) => {
                      const pred = predecessorTaskMap.get(dep.predecessorId);
                      return (
                        <div key={dep.id} className="flex items-center gap-2 bg-[#86C175]/10 border border-[#52B552]/30 rounded-lg px-3 py-1.5">
                          <ArrowRight size={12} className="text-[#147F23] shrink-0" />
                          <span className="flex-1 text-xs font-medium text-[#1D1D1B] truncate">{pred?.title ?? dep.predecessorId}</span>
                          <span className="text-[10px] text-[#706F6F] shrink-0">
                            {pred?.status === 'DONE' ? '✓ Concluída' : pred?.status === 'IN_PROGRESS' ? 'Em andamento' : 'Pendente'}
                          </span>
                          <button type="button" onClick={() => removeDependency(dep.id)} className="text-[#878787] hover:text-red-500 transition-colors shrink-0">
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {addingDep && (
                    <div className="mt-2 flex gap-2 items-center">
                      <select
                        value={selectedPred}
                        onChange={(e) => setSelectedPred(e.target.value)}
                        className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none bg-white"
                      >
                        <option value="">Selecione a predecessora…</option>
                        {availableToLink.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                      <button type="button" onClick={addDependency} disabled={!selectedPred || depLoading}
                        className="px-3 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                        style={{ backgroundColor: '#147F23' }}>
                        {depLoading ? '…' : 'OK'}
                      </button>
                      <button type="button" onClick={() => { setAddingDep(false); setSelectedPred(''); }} className="text-[#706F6F]">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertTriangle size={13} /> {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between shrink-0">
            {isEdit ? (
              !confirmDel ? (
                <button type="button" onClick={() => setConfirmDel(true)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors">
                  <Trash2 size={13} /> Excluir
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">Confirmar exclusão?</span>
                  <button type="button" onClick={handleDelete} disabled={deleting}
                    className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-lg font-semibold disabled:opacity-50">
                    {deleting ? '…' : 'Sim'}
                  </button>
                  <button type="button" onClick={() => setConfirmDel(false)} className="text-xs text-[#706F6F]">Não</button>
                </div>
              )
            ) : <span />}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#575756] hover:text-[#1D1D1B] transition-colors">Cancelar</button>
              <button type="submit" disabled={saving || (isEdit && !isDirty)}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors"
                style={{ backgroundColor: '#147F23' }}>
                {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
