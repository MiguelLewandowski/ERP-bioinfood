'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import type { CrmActivityDto, CrmActivityType } from '@bioinfood/shared';
import { crmActivitiesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const TYPE_LABELS: Record<CrmActivityType, string> = {
  NOTE: 'Nota',
  EMAIL: 'E-mail',
  CALL: 'Ligação',
  WHATSAPP: 'WhatsApp',
  PROPOSAL: 'Proposta',
  MEETING: 'Reunião',
  VISIT: 'Visita',
};

interface TaskFormValues {
  type: CrmActivityType;
  title: string;
  dueDate: string;
}

export function OpportunityTasksSection({ opportunityId, orgId }: { opportunityId: string; orgId: string }) {
  const { token, session } = useAuth();
  const [tasks, setTasks] = useState<CrmActivityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm<TaskFormValues>({
    defaultValues: { type: 'NOTE', title: '', dueDate: '' },
  });

  useEffect(() => {
    let cancelled = false;
    crmActivitiesApi.list(token, { opportunityId })
      .then((items) => { if (!cancelled) setTasks(items); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [opportunityId, token]);

  async function onSubmit(v: TaskFormValues) {
    if (!v.title.trim()) return;
    setSaving(true);
    try {
      const created = await crmActivitiesApi.create(
        {
          opportunityId, orgId, type: v.type, title: v.title, dueDate: v.dueDate || undefined,
          responsibleId: session.sub,
        },
        token,
      );
      setTasks((prev) => [created, ...prev]);
      reset({ type: 'NOTE', title: '', dueDate: '' });
      setShowForm(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleDone(task: CrmActivityDto) {
    const nextStatus = task.status === 'DONE' ? 'PENDING' : 'DONE';
    try {
      const updated = await crmActivitiesApi.update(task.id, { status: nextStatus }, token);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="mt-2 border-t border-border pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Tarefas</h3>
        {!showForm && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Adicionar tarefa
          </Button>
        )}
      </div>

      {loading && <p className="text-xs text-muted-foreground">Carregando…</p>}
      {!loading && tasks.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground">Nenhuma tarefa registrada para este negócio.</p>
      )}

      <ul className="space-y-1.5">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5">
            <button
              type="button"
              onClick={() => toggleDone(t)}
              className="shrink-0 text-muted-foreground hover:text-primary"
              aria-label={t.status === 'DONE' ? 'Reabrir tarefa' : 'Concluir tarefa'}
            >
              {t.status === 'DONE' ? <CheckCircle2 size={16} className="text-primary" /> : <Circle size={16} />}
            </button>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {TYPE_LABELS[t.type]}
            </span>
            <span className={`flex-1 truncate text-sm ${t.status === 'DONE' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {t.title}
            </span>
            {t.dueDate && (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {new Date(t.dueDate).toLocaleDateString('pt-BR')}
              </span>
            )}
          </li>
        ))}
      </ul>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-2 rounded-lg bg-muted/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            <Select {...register('type')} aria-label="Tipo de tarefa">
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Input {...register('dueDate')} type="date" aria-label="Prazo" />
          </div>
          <Input {...register('title', { required: true })} placeholder="Título da tarefa" autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { reset(); setShowForm(false); }}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Salvando…' : 'Adicionar'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
