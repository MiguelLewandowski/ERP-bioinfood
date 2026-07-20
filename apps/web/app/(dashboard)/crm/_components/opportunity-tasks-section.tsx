'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, ListChecks } from 'lucide-react';
import type { CrmActivityDto, UserDto } from '@bioinfood/shared';
import { crmActivitiesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { bucketOf, sortByUrgency } from '@/lib/crm-tasks';
import { Button } from '@/components/ui/button';
import { TaskRow } from './task-row';
import { TaskDialog } from './task-dialog';

interface OpportunityTasksSectionProps {
  opportunityId: string;
  orgId: string;
  users: UserDto[];
  /** Escrita de CRM é exclusiva do ADMIN — sem isto a UI oferecia ações que davam 403. */
  canEdit: boolean;
  /** Avisa o kanban para atualizar o badge de tarefa urgente do card. */
  onTasksChanged?: () => void;
}

export function OpportunityTasksSection({
  opportunityId, orgId, users, canEdit, onTasksChanged,
}: OpportunityTasksSectionProps) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<CrmActivityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CrmActivityDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    crmActivitiesApi.list(token, { opportunityId })
      .then((items) => { if (!cancelled) setTasks(items); })
      .catch((err) => { if (!cancelled) toast.error(getErrorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [opportunityId, token]);

  const { pending, done } = useMemo(() => {
    const sorted = [...tasks].sort(sortByUrgency);
    return {
      pending: sorted.filter((t) => bucketOf(t) !== 'done'),
      done: sorted.filter((t) => bucketOf(t) === 'done'),
    };
  }, [tasks]);

  async function toggleDone(task: CrmActivityDto) {
    const nextStatus = task.status === 'DONE' ? 'PENDING' : 'DONE';
    try {
      const updated = await crmActivitiesApi.update(task.id, { status: nextStatus }, token);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      onTasksChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleSaved(saved: CrmActivityDto) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev];
    });
    onTasksChanged?.();
  }

  function handleDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    onTasksChanged?.();
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(task: CrmActivityDto) {
    setEditing(task);
    setDialogOpen(true);
  }

  return (
    <div className="mt-2 border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ListChecks size={15} className="text-muted-foreground" />
          Tarefas
          {pending.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground">({pending.length} pendente{pending.length > 1 ? 's' : ''})</span>
          )}
        </h3>
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={openNew}>
            <Plus size={14} /> Nova tarefa
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-1.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg border border-border/60 bg-muted/40" />
          ))}
        </div>
      )}

      {!loading && tasks.length === 0 && (
        <p className="py-3 text-center text-xs text-muted-foreground">
          Nenhuma tarefa neste negócio.
          {canEdit && ' Crie uma para não perder o próximo passo.'}
        </p>
      )}

      {!loading && pending.length > 0 && (
        <div className="space-y-1.5">
          {pending.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onToggle={canEdit ? toggleDone : undefined}
              onEdit={canEdit ? openEdit : undefined}
            />
          ))}
        </div>
      )}

      {/* Concluídas colapsadas: antes empilhavam na mesma lista rolável e
          comiam a área útil do modal conforme o negócio envelhecia. */}
      {!loading && done.length > 0 && (
        <details className="mt-2 group">
          <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground hover:text-foreground">
            Concluídas ({done.length})
          </summary>
          <div className="mt-1.5 space-y-1.5">
            {done.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={canEdit ? toggleDone : undefined}
                onEdit={canEdit ? openEdit : undefined}
              />
            ))}
          </div>
        </details>
      )}

      {dialogOpen && (
        <TaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          task={editing}
          defaults={{ opportunityId, orgId }}
          users={users}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
