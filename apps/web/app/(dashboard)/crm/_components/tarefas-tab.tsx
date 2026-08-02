'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ListChecks, RotateCcw, CalendarDays } from 'lucide-react';
import type { CrmActivityDto, CrmActivityType, UserDto } from '@bioinfood/shared';
import { crmActivitiesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import {
  ACTIVITY_TYPE_LABELS, BUCKET_LABELS, bucketOf, groupByBucket, groupByDay, type TaskBucket,
} from '@/lib/crm-tasks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { TaskRow } from './task-row';
import { TaskDialog } from './task-dialog';

// Baldes acionáveis mostrados como chips-filtro. "Mais tarde" e "Sem prazo"
// existem no agrupamento mas não viram chip — não são urgência, são backlog.
const CHIP_BUCKETS: TaskBucket[] = ['overdue', 'today', 'week'];

const CHIP_COLORS: Record<string, string> = {
  overdue: 'text-destructive',
  today: 'text-accent',
  week: 'text-foreground',
};

// Pendências = o que exige ação, agrupado por urgência.
// Agenda      = linha do tempo com o histórico, incluindo o que já foi feito.
type ViewMode = 'pendencias' | 'agenda';

interface TarefasTabProps {
  users: UserDto[];
  canEdit: boolean;
}

export function TarefasTab({ users, canEdit }: TarefasTabProps) {
  const { token, session } = useAuth();
  const [tasks, setTasks] = useState<CrmActivityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CrmActivityDto | null>(null);

  const [view, setView] = useState<ViewMode>('pendencias');
  const [responsibleId, setResponsibleId] = useState('');
  const [type, setType] = useState<'' | CrmActivityType>('');
  const [bucketFilter, setBucketFilter] = useState<TaskBucket | null>(null);
  const [showDone, setShowDone] = useState(false);

  // Uma requisição só; o agrupamento em atrasadas/hoje/semana acontece no
  // cliente. Volume de tarefas de CRM da equipe não justifica 4 chamadas.
  useEffect(() => {
    let cancelled = false;
    crmActivitiesApi.list(token)
      .then((items) => { if (!cancelled) setTasks(items); })
      .catch((err) => { if (!cancelled) toast.error(getErrorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  // Na Agenda as concluídas entram sempre — são o registro do que foi feito.
  const includeDone = view === 'agenda' || showDone;

  const visible = useMemo(() => tasks.filter((t) => {
    if (responsibleId && t.responsibleId !== responsibleId) return false;
    if (type && t.type !== type) return false;
    const bucket = bucketOf(t);
    if (!includeDone && bucket === 'done') return false;
    if (view === 'pendencias' && bucketFilter && bucket !== bucketFilter) return false;
    return true;
  }), [tasks, responsibleId, type, bucketFilter, includeDone, view]);

  const counts = useMemo(() => {
    const base = tasks.filter((t) => {
      if (responsibleId && t.responsibleId !== responsibleId) return false;
      if (type && t.type !== type) return false;
      return true;
    });
    return base.reduce<Record<string, number>>((acc, t) => {
      const bucket = bucketOf(t);
      acc[bucket] = (acc[bucket] ?? 0) + 1;
      return acc;
    }, {});
  }, [tasks, responsibleId, type]);

  const bucketGroups = useMemo(() => groupByBucket(visible), [visible]);
  const dayGroups = useMemo(() => groupByDay(visible), [visible]);
  const isEmpty = view === 'pendencias' ? bucketGroups.length === 0 : dayGroups.length === 0;
  const filtersActive = !!(responsibleId || type || bucketFilter || showDone);

  async function toggleDone(task: CrmActivityDto) {
    const nextStatus = task.status === 'DONE' ? 'PENDING' : 'DONE';
    try {
      const updated = await crmActivitiesApi.update(task.id, { status: nextStatus }, token);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleSaved(saved: CrmActivityDto) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev];
    });
  }

  function resetFilters() {
    setResponsibleId('');
    setType('');
    setBucketFilter(null);
    setShowDone(false);
  }

  const rowProps = {
    showContext: true,
    onToggle: canEdit ? toggleDone : undefined,
    onEdit: canEdit ? (task: CrmActivityDto) => { setEditing(task); setDialogOpen(true); } : undefined,
  };

  return (
    <div>
      {/* Barra de controles — mesma anatomia da tela de Atividades. */}
      <div className="mb-4 space-y-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {CHIP_BUCKETS.map((bucket) => (
            <button
              key={bucket}
              onClick={() => {
                setView('pendencias');
                setBucketFilter((c) => (c === bucket ? null : bucket));
              }}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors',
                view === 'pendencias' && bucketFilter === bucket
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50',
              )}
              aria-pressed={view === 'pendencias' && bucketFilter === bucket}
            >
              <span className={cn('text-lg font-bold leading-none', CHIP_COLORS[bucket])}>
                {counts[bucket] ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">{BUCKET_LABELS[bucket]}</span>
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {/* Alternador de visão — o CRM tem a própria agenda; /activities é
                das tarefas de projeto e não deve se misturar com o CRM. */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
              {([
                { id: 'pendencias' as const, label: 'Pendências', icon: ListChecks },
                { id: 'agenda' as const, label: 'Agenda', icon: CalendarDays },
              ]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    view === id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-pressed={view === id}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Select
            aria-label="Filtrar por responsável"
            className="w-auto min-w-[11rem]"
            value={responsibleId}
            onChange={(e) => setResponsibleId(e.target.value)}
          >
            <option value="">Todos os responsáveis</option>
            <option value={session.sub}>Minhas tarefas</option>
            {users.filter((u) => u.id !== session.sub).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>

          <Select
            aria-label="Filtrar por tipo"
            className="w-auto min-w-[9rem]"
            value={type}
            onChange={(e) => setType(e.target.value as '' | CrmActivityType)}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>

          {view === 'pendencias' ? (
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showDone}
                onChange={(e) => setShowDone(e.target.checked)}
                className="rounded border-input accent-primary"
              />
              Mostrar concluídas
            </label>
          ) : (
            <span className="text-xs text-muted-foreground">
              Inclui as concluídas como registro do que já foi feito.
            </span>
          )}

          {filtersActive && (
            <button
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw size={12} /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border/60 bg-muted/40" />
          ))}
        </div>
      )}

      {!loading && isEmpty && (
        <EmptyState
          icon={view === 'agenda' ? CalendarDays : ListChecks}
          title={filtersActive ? 'Nenhuma tarefa com esses filtros' : 'Tudo em dia'}
          description={
            filtersActive
              ? 'Ajuste os filtros para ver outras tarefas.'
              : 'Nenhuma tarefa no CRM. Crie uma a partir da oportunidade para registrar o próximo passo.'
          }
          action={filtersActive
            ? <Button variant="outline" onClick={resetFilters}>Limpar filtros</Button>
            : undefined}
        />
      )}

      {!loading && !isEmpty && view === 'pendencias' && (
        <div className="space-y-6">
          {bucketGroups.map(({ bucket, tasks: bucketTasks }) => (
            <section key={bucket}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className={cn('text-sm font-bold', CHIP_COLORS[bucket] ?? 'text-foreground')}>
                  {BUCKET_LABELS[bucket]}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {bucketTasks.length} {bucketTasks.length === 1 ? 'tarefa' : 'tarefas'}
                </span>
              </div>
              <div className="space-y-2">
                {bucketTasks.map((t) => <TaskRow key={t.id} task={t} {...rowProps} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {!loading && !isEmpty && view === 'agenda' && (
        <div className="space-y-6">
          {dayGroups.map(({ key, label, tasks: dayTasks }) => {
            const done = dayTasks.filter((t) => bucketOf(t) === 'done').length;
            return (
              <section key={key}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-sm font-bold capitalize text-foreground">{label}</h2>
                  <span className="text-xs text-muted-foreground">
                    {dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}
                    {done > 0 && ` · ${done} concluída${done > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="space-y-2">
                  {dayTasks.map((t) => <TaskRow key={t.id} task={t} {...rowProps} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {dialogOpen && (
        <TaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          task={editing}
          users={users}
          onSaved={handleSaved}
          onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
        />
      )}
    </div>
  );
}
