'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { X, Trash2, AlertTriangle, Link2, Plus, ArrowRight, CheckSquare, Square, ListChecks, FileCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, dialogDrawerRightClass } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { popsApi, tasksApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import type { ProjectMember } from '@/lib/project-members';
import type { TaskDto as Task, TaskChecklistItemDto as TaskChecklistItem, PopDto } from '@bioinfood/shared';
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
    // Tarefa de cronograma é dia puro, sem horário — decisão de produto da §7 do
    // incidente. Quem precisa de compromisso com hora usa Activity, que já tem
    // semântica de agenda. O Gantt trabalha em dias, duração é em dias e baseline
    // é em dias: hora aqui não tinha para onde ir.
    startDate:   z.string().optional(),
    dueDate:     z.string().optional(),
  })
  .refine((data) => !data.startDate || !data.dueDate || data.dueDate >= data.startDate, {
    message: 'O prazo não pode ser anterior à data de início',
    path: ['dueDate'],
  });

type FormValues = z.infer<typeof schema>;

function toDateInput(d: string | null | undefined): string {
  if (!d) return '';
  return d.split('T')[0];
}

// Data de cronograma é dia de calendário: vai crua, como 'YYYY-MM-DD'.
//
// O que estava aqui antes era `new Date(\`${date}T${time}:00\`).toISOString()`.
// Sem `Z`, o construtor lê meia-noite LOCAL e o toISOString convertia para UTC:
// "1º de outubro" virava `2026-10-01T03:00:00.000Z` em UTC-3. `@IsDateString`
// aceita 'YYYY-MM-DD' e a API grava 00:00Z — o mesmo que o banco já tem.
//
// Ver docs/incidentes/timezone-cronograma.md §2.1.
function toApiDay(date: string): string {
  return date.slice(0, 10);
}

// Id local de item ainda não persistido (modo criação). Nunca vai para a API:
// serve só de `key` no React e de alvo do remover antes do POST da tarefa.
let tmpSeq = 0;
function tmpId(): string {
  return `tmp-${++tmpSeq}`;
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
  const { token, session } = useAuth();
  const isEdit = mode === 'edit' && !!task;

  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError]           = useState('');

  // Checklist, dependências e POPs existem nos dois modos. Na criação a tarefa
  // ainda não tem id, então os itens ficam em memória com id `tmp-` e só são
  // persistidos depois do POST da tarefa — ver `persistStaged`.
  const [allTasks, setAllTasks]         = useState<Task[]>([]);
  const [predecessors, setPredecessors] = useState(task?.predecessors ?? []);
  const [addingDep, setAddingDep]       = useState(false);
  const [selectedPred, setSelectedPred] = useState('');
  const [depLoading, setDepLoading]     = useState(false);

  const [checklist, setChecklist]     = useState<TaskChecklistItem[]>(task?.checklist ?? []);
  const [newItemText, setNewItemText] = useState('');
  const [addingItem, setAddingItem]   = useState(false);
  const newItemRef                    = useRef<HTMLInputElement>(null);

  const [allPops, setAllPops]       = useState<PopDto[]>([]);
  const [taskPops, setTaskPops]     = useState(task?.pops ?? []);
  const [addingPop, setAddingPop]   = useState(false);
  const [selectedPop, setSelectedPop] = useState('');
  const [popLoading, setPopLoading] = useState(false);

  useEffect(() => {
    api.get<Task[]>(`/projects/${projectId}/tasks`, token)
      .then((data) => setAllTasks(data.filter((t) => t.id !== task?.id && !t.deletedAt)))
      .catch(() => {});
  }, [projectId, token, task]);

  useEffect(() => {
    popsApi.list(token).then(setAllPops).catch(() => {});
  }, [token]);

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
        startDate:   values.startDate ? toApiDay(values.startDate) : undefined,
        dueDate:     values.dueDate ? toApiDay(values.dueDate) : undefined,
        ...(isEdit ? { status: values.status } : {}),
      };

      if (isEdit) {
        const updated = await api.patch<Task>(`/projects/${projectId}/tasks/${task!.id}`, payload, token);
        onUpdated?.({ ...updated, predecessors, checklist });
      } else {
        const created = await api.post<Task>(`/projects/${projectId}/tasks`, payload, token);
        const staged  = await persistStaged(created.id);
        if (staged.failed.length > 0) {
          toast.warning(`Tarefa criada, mas não foi possível salvar: ${staged.failed.join(', ')}.`);
        }
        onCreated?.({
          ...created,
          checklist:    staged.checklist,
          predecessors: staged.predecessors,
          pops:         staged.pops,
        });
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // Grava os itens que ficaram em memória durante a criação. Cada um vai
  // isolado: uma POP que falha não derruba o checklist já salvo, e a tarefa em
  // si já existe neste ponto — por isso o erro é avisado, não propagado.
  async function persistStaged(taskId: string) {
    const saved = {
      checklist:    [] as TaskChecklistItem[],
      predecessors: [] as Task['predecessors'],
      pops:         [] as Task['pops'],
      failed:       [] as string[],
    };

    for (const item of checklist) {
      try {
        saved.checklist.push(await api.post<TaskChecklistItem>(
          `/projects/${projectId}/tasks/${taskId}/checklist`, { text: item.text }, token,
        ));
      } catch {
        saved.failed.push(`item "${item.text}"`);
      }
    }

    for (const dep of predecessors) {
      try {
        saved.predecessors.push(await api.post<Task['predecessors'][number]>(
          `/projects/${projectId}/tasks/${taskId}/dependencies`, { predecessorId: dep.predecessorId }, token,
        ));
      } catch {
        const title = allTasks.find((t) => t.id === dep.predecessorId)?.title ?? 'tarefa';
        saved.failed.push(`dependência de "${title}"`);
      }
    }

    for (const link of taskPops) {
      try {
        saved.pops.push(await tasksApi.addPop(projectId, taskId, link.popVersionId, token));
      } catch {
        saved.failed.push(`POP "${link.pop.title}"`);
      }
    }

    return saved;
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
    if (!selectedPred) return;
    if (!isEdit) {
      setPredecessors((prev) => [...prev, { id: tmpId(), predecessorId: selectedPred, type: 'FS', lag: 0 }]);
      setSelectedPred('');
      setAddingDep(false);
      return;
    }
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
    if (!isEdit) {
      setPredecessors((prev) => prev.filter((d) => d.id !== depId));
      return;
    }
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

  // ── POPs utilizadas ─────────────────────────────────────────────────────────

  async function addPop() {
    if (!selectedPop) return;
    if (!isEdit) {
      const pop = allPops.find((p) => p.latestVersion.id === selectedPop);
      if (!pop) return;
      setTaskPops((prev) => [...prev, {
        id:            tmpId(),
        popVersionId:  pop.latestVersion.id,
        addedBy:       { id: session.sub, name: 'você' },
        pop:           { id: pop.id, title: pop.title },
        versionNumber: pop.latestVersion.versionNumber,
        createdAt:     new Date().toISOString(),
      }]);
      setSelectedPop('');
      setAddingPop(false);
      return;
    }
    setPopLoading(true);
    try {
      const link = await tasksApi.addPop(projectId, task!.id, selectedPop, token);
      const next = [...taskPops, link];
      setTaskPops(next);
      setSelectedPop('');
      setAddingPop(false);
      onUpdated?.({ ...task!, predecessors, checklist, pops: next });
      toast.success('POP vinculada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPopLoading(false);
    }
  }

  async function removePop(linkId: string) {
    if (!isEdit) {
      setTaskPops((prev) => prev.filter((p) => p.id !== linkId));
      return;
    }
    try {
      await tasksApi.removePop(projectId, task!.id, linkId, token);
      const next = taskPops.filter((p) => p.id !== linkId);
      setTaskPops(next);
      onUpdated?.({ ...task!, predecessors, checklist, pops: next });
      toast.success('POP desvinculada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  // ── Checklist ───────────────────────────────────────────────────────────────

  async function addChecklistItem() {
    if (!newItemText.trim()) return;
    if (!isEdit) {
      setChecklist((prev) => [...prev, {
        id: tmpId(), taskId: '', text: newItemText.trim(), checked: false, order: prev.length,
      }]);
      setNewItemText('');
      return;
    }
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
    if (!isEdit) return;
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
    if (!isEdit) return;
    api.delete(`/projects/${projectId}/tasks/${task!.id}/checklist/${itemId}`, token).catch((err) => {
      if (removed) setChecklist((prev) => [...prev, removed]);
      toast.error(getErrorMessage(err));
    });
  }

  async function renameChecklistItem(item: TaskChecklistItem, text: string) {
    if (!text.trim() || text === item.text) return;
    if (!isEdit) {
      setChecklist((prev) => prev.map((i) => i.id === item.id ? { ...i, text } : i));
      return;
    }
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

  const alreadyLinkedPopIds = new Set(taskPops.map((p) => p.pop.id));
  const availablePops       = allPops.filter((p) => !alreadyLinkedPopIds.has(p.id));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      {/* Drawer lateral: sobrescreve o posicionamento centrado do DialogContent. */}
      <DialogContent className={cn(dialogDrawerRightClass, 'w-[460px] max-w-full sm:max-w-[460px]')}>
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="text-sm">{isEdit ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* ── Campos principais ── */}
            <div>
              <label htmlFor="task-title" className="block text-xs font-semibold text-muted-foreground mb-1">Título *</label>
              <input
                id="task-title"
                {...register('title')}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none"
                placeholder="Título da tarefa"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label htmlFor="task-description" className="block text-xs font-semibold text-muted-foreground mb-1">Descrição</label>
              <textarea
                id="task-description"
                {...register('description')}
                rows={3}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none resize-none"
                placeholder="Detalhes opcionais…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {isEdit && (
                <div>
                  <label htmlFor="task-status" className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                  <select
                    id="task-status"
                    {...register('status')}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white"
                  >
                    <option value="TODO">A fazer</option>
                    <option value="IN_PROGRESS">Em andamento</option>
                    <option value="DONE">Concluído</option>
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="task-priority" className="block text-xs font-semibold text-muted-foreground mb-1">Prioridade</label>
                <select
                  id="task-priority"
                  {...register('priority')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="task-assigneeId" className="block text-xs font-semibold text-muted-foreground mb-1">Responsável</label>
              <select
                id="task-assigneeId"
                {...register('assigneeId')}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white"
              >
                <option value="">— Sem responsável —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-storyPoints" className="block text-xs font-semibold text-muted-foreground mb-1">Story Points</label>
              <input
                id="task-storyPoints"
                {...register('storyPoints')}
                type="number"
                min={1}
                max={100}
                placeholder="Esforço relativo, opcional"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="task-startDate" className="block text-xs font-semibold text-muted-foreground mb-1">Data de Início</label>
                <input id="task-startDate" {...register('startDate')} type="date" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none" />
              </div>
              <div>
                <label htmlFor="task-dueDate" className="block text-xs font-semibold text-muted-foreground mb-1">Prazo</label>
                <input id="task-dueDate" {...register('dueDate')} type="date" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none" />
                {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate.message}</p>}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-3">Preencha início e prazo para aparecer no Gantt. Para compromisso com hora marcada, use Atividades.</p>

                {/* ── Checklist ── */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ListChecks size={14} className="text-primary" />
                      <span className="text-xs font-bold text-foreground">Checklist</span>
                      {checklist.length > 0 && (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {checklist.filter((i) => i.checked).length}/{checklist.length}
                        </span>
                      )}
                    </div>
                    {checklist.length > 0 && (
                      <span className="text-xs font-bold" style={{ color: progress === 100 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>
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
                          backgroundColor: progress === 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))',
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
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {item.checked
                            ? <CheckSquare size={16} style={{ color: 'hsl(var(--primary))' }} />
                            : <Square size={16} />}
                        </button>
                        <input
                          defaultValue={item.text}
                          onBlur={(e) => renameChecklistItem(item, e.target.value)}
                          className={`flex-1 text-sm bg-transparent focus:outline-none focus:bg-white focus:border-b focus:border-ring transition-colors ${
                            item.checked ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => deleteChecklistItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all shrink-0"
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
                        className="flex-1 text-sm px-3 py-1.5 border border-ring rounded-lg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={addChecklistItem}
                        disabled={!newItemText.trim()}
                        className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                        style={{ backgroundColor: 'hsl(var(--primary))' }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingItem(false); setNewItemText(''); }}
                        className="text-muted-foreground"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingItem(true)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                    >
                      <Plus size={13} /> Adicionar item
                    </button>
                  )}
                </div>

                {/* ── Dependências ── */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Link2 size={13} className="text-primary" />
                      <span className="text-xs font-bold text-foreground">Dependências</span>
                      <span className="text-[10px] text-muted-foreground">(começa após…)</span>
                    </div>
                    {!addingDep && availableToLink.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAddingDep(true)}
                        aria-label="Adicionar dependência"
                        className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                      >
                        <Plus size={12} /> Adicionar
                      </button>
                    )}
                  </div>

                  {predecessors.length === 0 && !addingDep && (
                    <p className="text-xs text-muted-foreground py-1">Nenhuma dependência.</p>
                  )}

                  <div className="space-y-1.5">
                    {predecessors.map((dep) => {
                      const pred = predecessorTaskMap.get(dep.predecessorId);
                      return (
                        <div key={dep.id} className="flex items-center gap-2 bg-success/10 border border-ring/30 rounded-lg px-3 py-1.5">
                          <ArrowRight size={12} className="text-primary shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{pred?.title ?? dep.predecessorId}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {pred?.status === 'DONE' ? '✓ Concluída' : pred?.status === 'IN_PROGRESS' ? 'Em andamento' : 'Pendente'}
                          </span>
                          <button type="button" onClick={() => removeDependency(dep.id)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
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
                        aria-label="Tarefa predecessora"
                        className="min-w-0 flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white"
                      >
                        <option value="">Selecione a predecessora…</option>
                        {availableToLink.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                      <button type="button" onClick={addDependency} disabled={!selectedPred || depLoading}
                        className="px-3 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                        style={{ backgroundColor: 'hsl(var(--primary))' }}>
                        {depLoading ? '…' : 'OK'}
                      </button>
                      <button type="button" onClick={() => { setAddingDep(false); setSelectedPred(''); }} className="text-muted-foreground">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* ── POPs utilizadas ── */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <FileCheck size={13} className="text-primary" />
                      <span className="text-xs font-bold text-foreground">POPs utilizadas</span>
                    </div>
                    {!addingPop && availablePops.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAddingPop(true)}
                        aria-label="Adicionar POP"
                        className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                      >
                        <Plus size={12} /> Adicionar
                      </button>
                    )}
                  </div>

                  {taskPops.length === 0 && !addingPop && (
                    <p className="text-xs text-muted-foreground py-1">Nenhuma POP vinculada.</p>
                  )}

                  <div className="space-y-1.5">
                    {taskPops.map((link) => (
                      <div key={link.id} className="flex items-center gap-2 bg-success/10 border border-ring/30 rounded-lg px-3 py-1.5">
                        <FileCheck size={12} className="text-primary shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{link.pop.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">v{link.versionNumber}</span>
                        <button type="button" onClick={() => removePop(link.id)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* min-w-0 no select: item flex não encolhe abaixo do próprio
                      conteúdo por padrão, e título de POP é longo — sem isso ele
                      estoura a largura do drawer e cria scroll horizontal. */}
                  {addingPop && (
                    <div className="mt-2 flex gap-2 items-center">
                      <select
                        value={selectedPop}
                        onChange={(e) => setSelectedPop(e.target.value)}
                        aria-label="POP a vincular"
                        className="min-w-0 flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white"
                      >
                        <option value="">Selecione a POP…</option>
                        {availablePops.map((p) => (
                          <option key={p.id} value={p.latestVersion.id}>{p.title} (v{p.latestVersion.versionNumber})</option>
                        ))}
                      </select>
                      <button type="button" onClick={addPop} disabled={!selectedPop || popLoading}
                        className="px-3 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                        style={{ backgroundColor: 'hsl(var(--primary))' }}>
                        {popLoading ? '…' : 'OK'}
                      </button>
                      <button type="button" onClick={() => { setAddingPop(false); setSelectedPop(''); }} className="text-muted-foreground">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

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
                  <button type="button" onClick={() => setConfirmDel(false)} className="text-xs text-muted-foreground">Não</button>
                </div>
              )
            ) : <span />}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
              <button type="submit" disabled={saving || (isEdit && !isDirty)}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors"
                style={{ backgroundColor: 'hsl(var(--primary))' }}>
                {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
