'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  crmTaskSchema, type CrmActivityDto, type CrmTaskFormData, type UserDto,
} from '@bioinfood/shared';
import { crmActivitiesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { ACTIVITY_TYPE_LABELS } from '@/lib/crm-tasks';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const PRIORITY_OPTIONS: Array<{ value: CrmTaskFormData['priority']; label: string }> = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'CRITICAL', label: 'Crítica' },
];

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tarefa existente = modo edição; ausente = criação. */
  task?: CrmActivityDto | null;
  /** Vínculo usado só na criação. */
  defaults?: { opportunityId?: string; orgId?: string };
  users: UserDto[];
  onSaved: (task: CrmActivityDto) => void;
  onDeleted?: (taskId: string) => void;
}

/**
 * Formulário único de tarefa de CRM — serve a aba Tarefas e a seção de tarefas
 * dentro do negócio. Cobre todos os campos que a API aceita (antes o form
 * inline coletava só 3 de 6 e fixava o responsável no usuário logado).
 */
export function TaskDialog({
  open, onOpenChange, task, defaults, users, onSaved, onDeleted,
}: TaskDialogProps) {
  const { token, session } = useAuth();
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const isEdit = !!task;

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<CrmTaskFormData>({
    resolver: zodResolver(crmTaskSchema),
    defaultValues: {
      title: task?.title ?? '',
      type: task?.type ?? 'CALL',
      priority: task?.priority ?? 'MEDIUM',
      dueDate: task?.dueDate?.slice(0, 10) ?? '',
      responsibleId: task?.responsibleId ?? session.sub,
      description: task?.description ?? '',
    },
  });

  async function onSubmit(v: CrmTaskFormData) {
    const payload = {
      title: v.title,
      type: v.type,
      priority: v.priority,
      dueDate: v.dueDate || undefined,
      responsibleId: v.responsibleId || undefined,
      description: v.description || undefined,
    };
    try {
      const saved = isEdit
        ? await crmActivitiesApi.update(task!.id, payload, token)
        : await crmActivitiesApi.create({ ...payload, ...defaults }, token);
      onSaved(saved);
      toast.success(isEdit ? 'Tarefa atualizada' : 'Tarefa criada');
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!task) return;
    const ok = await confirm({
      title: 'Excluir tarefa',
      description: `"${task.title}" será removida permanentemente.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await crmActivitiesApi.remove(task.id, token);
      onDeleted?.(task.id);
      toast.success('Tarefa excluída');
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="task-title">Título *</Label>
            <Input id="task-title" {...register('title')} placeholder="Ex: Retornar ligação da ACME" autoFocus />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="task-type">Tipo</Label>
              <Select id="task-type" {...register('type')}>
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-priority">Prioridade</Label>
              <Select id="task-priority" {...register('priority')}>
                {PRIORITY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="task-due">Prazo</Label>
              <Input id="task-due" type="date" {...register('dueDate')} />
            </div>
            <div>
              <Label htmlFor="task-responsible">Responsável</Label>
              <Select id="task-responsible" {...register('responsibleId')}>
                <option value="">Ninguém</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="task-description">Observações</Label>
            <Textarea id="task-description" rows={3} {...register('description')} placeholder="Contexto, o que precisa ser feito…" />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <DialogFooter className="gap-2">
            {isEdit && onDeleted && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={deleting || isSubmitting}
                className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={15} /> Excluir
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || deleting}>
              {isSubmitting ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
