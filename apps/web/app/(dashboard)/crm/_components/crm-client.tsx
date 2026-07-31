'use client'; // kanban with drag-and-drop requires client interaction

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import {
  Plus, Settings, Snowflake, Sun, Search, Star, User, X,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  PipelineDto, OpportunityDto, PipelineSummaryDto, CrmActivityDto, UserDto,
} from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { crmActivitiesApi, opportunitiesApi, pipelinesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { bucketOf, sortByUrgency, summarizeOpportunityTasks } from '@/lib/crm-tasks';
import { CrmColumn } from './crm-column';
import { CrmCard, formatBRL } from './crm-card';
import { OpportunityDialog } from './opportunity-dialog';

interface CrmClientProps {
  pipelines: PipelineDto[];
  currentPipeline: PipelineDto | null;
  initialOpportunities: OpportunityDto[];
  summary: PipelineSummaryDto | null;
  initialTasks: CrmActivityDto[];
  users: UserDto[];
  canEdit: boolean;
}

export function CrmClient(props: CrmClientProps) {
  const { token, session } = useAuth();
  const [pipeline, setPipeline] = useState(props.currentPipeline);
  const [opps, setOpps] = useState(props.initialOpportunities);
  const [summary, setSummary] = useState(props.summary);
  const [tasks, setTasks] = useState(props.initialTasks);
  const [active, setActive] = useState<OpportunityDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OpportunityDto | null>(null);
  const [pendingLost, setPendingLost] = useState<{ oppId: string; stageId: string } | null>(null);
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);

  const tasksByOpportunity = useMemo(() => {
    const map = new Map<string, CrmActivityDto[]>();
    for (const t of tasks) {
      if (!t.opportunityId) continue;
      const list = map.get(t.opportunityId);
      if (list) list.push(t);
      else map.set(t.opportunityId, [t]);
    }
    return map;
  }, [tasks]);

  // Tarefa mais urgente por negócio: a de menor balde (atrasada > hoje) vence.
  const urgentByOpportunity = useMemo(() => {
    const map = new Map<string, CrmActivityDto>();
    for (const [oppId, list] of tasksByOpportunity) {
      const urgent = list
        .filter((t) => ['overdue', 'today'].includes(bucketOf(t)))
        .sort(sortByUrgency)[0];
      if (urgent) map.set(oppId, urgent);
    }
    return map;
  }, [tasksByOpportunity]);

  // Recarrega o indicador depois que tarefas mudam dentro do modal do negócio —
  // sem isto o card ficava desatualizado até um refresh da página.
  async function reloadTasks() {
    try {
      const items = await crmActivitiesApi.list(token);
      setTasks(items.filter((t) => t.opportunityId));
    } catch {
      // Sinal auxiliar: falhar aqui não deve interromper o fluxo do kanban.
    }
  }

  async function completeUrgentTask(taskId: string) {
    const prev = tasks;
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, status: 'DONE' as const } : t)));
    try {
      await crmActivitiesApi.update(taskId, { status: 'DONE' }, token);
      toast.success('Tarefa concluída');
    } catch (err) {
      setTasks(prev);
      toast.error(getErrorMessage(err));
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const stages = (pipeline?.stages ?? []).filter((s) => s.isActive).sort((a, b) => a.order - b.order);
  const firstOpen = stages.find((s) => s.type === 'OPEN');
  const stageAmount = (stageId: string) =>
    summary?.stages.find((s) => s.stageId === stageId)?.amount ?? '0.00';

  async function refreshSummary(pid: string) {
    try { setSummary(await pipelinesApi.summary(pid, token)); } catch { /* metrics are best-effort */ }
  }

  async function switchPipeline(id: string) {
    const next = props.pipelines.find((p) => p.id === id) ?? null;
    setPipeline(next);
    if (!next) return;
    try {
      const [o, s] = await Promise.all([
        opportunitiesApi.list(next.id, token),
        pipelinesApi.summary(next.id, token),
      ]);
      setOpps(o);
      setSummary(s);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function onDragStart({ active: a }: DragStartEvent) {
    setActive(opps.find((o) => o.id === a.id) ?? null);
  }

  async function onDragEnd({ active: a, over }: DragEndEvent) {
    setActive(null);
    if (!over || !pipeline) return;
    const oppId = a.id as string;
    const overData = over.data.current as { stageId?: string; stageType?: string } | undefined;
    const targetStageId = overData?.stageId ?? (over.id as string);
    const opp = opps.find((o) => o.id === oppId);
    if (!opp) return;

    // Mesma coluna: reordenar posição do card dentro da etapa.
    if (opp.stageId === targetStageId) {
      if (over.id === oppId || over.id === targetStageId) return; // solto sobre si mesmo/área vazia
      await reorderWithinStage(targetStageId, oppId, over.id as string);
      return;
    }

    const targetType = stages.find((s) => s.id === targetStageId)?.type;
    // Losing a deal asks for a reason before committing the move.
    if (targetType === 'LOST') {
      setPendingLost({ oppId, stageId: targetStageId });
      return;
    }
    await commitMove(oppId, targetStageId, undefined, opp.stageId);
  }

  async function reorderWithinStage(stageId: string, activeId: string, overId: string) {
    const stageOpps = opps
      .filter((o) => o.stageId === stageId && !o.frozenAt && matchesFilter(o))
      .sort((a, b) => a.order - b.order);
    const oldIndex = stageOpps.findIndex((o) => o.id === activeId);
    const newIndex = stageOpps.findIndex((o) => o.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = arrayMove(stageOpps, oldIndex, newIndex);
    const items = reordered.map((o, i) => ({ id: o.id, order: i }));

    const prevOpps = opps;
    setOpps((prev) => prev.map((o) => {
      const found = items.find((i) => i.id === o.id);
      return found ? { ...o, order: found.order } : o;
    }));

    try {
      await opportunitiesApi.reorder(stageId, items, token);
    } catch (err) {
      setOpps(prevOpps);
      toast.error(getErrorMessage(err));
    }
  }

  async function commitMove(oppId: string, stageId: string, lostReason: string | undefined, prevStageId: string) {
    setOpps((prev) => prev.map((o) => (o.id === oppId ? { ...o, stageId } : o)));
    try {
      const moved = await opportunitiesApi.move(oppId, stageId, token, lostReason);
      setOpps((prev) => prev.map((o) => (o.id === oppId ? moved : o)));
      if (pipeline) refreshSummary(pipeline.id);
    } catch (err) {
      setOpps((prev) => prev.map((o) => (o.id === oppId ? { ...o, stageId: prevStageId } : o)));
      toast.error(getErrorMessage(err));
    }
  }

  function onSaved(saved: OpportunityDto) {
    setOpps((prev) => {
      // Movida para outro funil: some da visão atual, que é por pipeline.
      if (pipeline && saved.pipelineId !== pipeline.id) return prev.filter((o) => o.id !== saved.id);
      const exists = prev.some((o) => o.id === saved.id);
      return exists ? prev.map((o) => (o.id === saved.id ? saved : o)) : [saved, ...prev];
    });
    if (pipeline) refreshSummary(pipeline.id);
  }

  function onDeleted(id: string) {
    setOpps((prev) => prev.filter((o) => o.id !== id));
    if (pipeline) refreshSummary(pipeline.id);
  }

  async function reactivate(id: string) {
    try {
      const saved = await opportunitiesApi.unfreeze(id, token);
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const frozenOpps = opps.filter((o) => o.frozenAt);

  // Filtro do board (achado #5 da análise de UI/UX): busca por título/empresa
  // e "meus negócios" — client-side, sobre o que já foi carregado.
  const filterActive = search.trim() !== '' || onlyMine;
  function matchesFilter(o: OpportunityDto): boolean {
    if (onlyMine && o.responsible?.id !== session.sub) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const org = (o.organization.tradeName ?? o.organization.legalName).toLowerCase();
      if (!o.title.toLowerCase().includes(q) && !org.includes(q)) return false;
    }
    return true;
  }

  if (!pipeline) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nenhum funil configurado.
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      {props.pipelines.length > 1 && (
        <PipelineRail pipelines={props.pipelines} activeId={pipeline.id} onSwitch={switchPipeline} />
      )}
      <div className="min-w-0 flex-1">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">
            {pipeline.name}{pipeline.isDefault ? ' (padrão)' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {props.canEdit && (
            <Link href="/crm/config?tab=funis" className={cn(buttonVariants({ variant: 'outline' }))}>
              <Settings size={15} /> Funis
            </Link>
          )}
          {props.canEdit && firstOpen && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> Nova Oportunidade
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar oportunidade ou empresa…"
            className="h-8 pl-8 pr-7 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOnlyMine((v) => !v)}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors',
            onlyMine
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-input text-muted-foreground hover:bg-muted/60',
          )}
        >
          <User size={13} /> Minhas oportunidades
        </button>
        {filterActive && (
          <button
            type="button"
            onClick={() => { setSearch(''); setOnlyMine(false); }}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {summary && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Metric label="Em aberto" value={formatBRL(summary.openTotal)} />
          <Metric
            label="Conversão"
            value={`${Math.round(summary.conversionRate * 100)}%`}
            tone={summary.conversionRate > 0 ? 'success' : 'default'}
          />
          <Metric label="Ganhos / Perdidos" value={`${summary.wonCount} / ${summary.lostCount}`} />
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <DndContext id="crm-kanban-dnd" sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid items-start gap-3" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(220px, 1fr))` }}>
            {(() => {
              // Base da porcentagem por etapa: mesma população que aparece nas colunas.
              const totalActive = opps.filter((o) => !o.frozenAt && matchesFilter(o)).length;
              return stages.map((stage) => {
                // Congelados saem do funil ativo (decisão 7) — vivem na seção abaixo.
                const colOpps = opps
                  .filter((o) => o.stageId === stage.id && !o.frozenAt && matchesFilter(o))
                  .sort((a, b) => a.order - b.order);
                return (
                  <CrmColumn
                    key={stage.id}
                    stage={stage}
                    count={colOpps.length}
                    percent={totalActive > 0 ? Math.round((colOpps.length / totalActive) * 100) : null}
                    amount={stageAmount(stage.id)}
                  >
                  <SortableContext items={colOpps.map((o) => o.id)} strategy={verticalListSortingStrategy}>
                    {colOpps.map((o) => (
                      <CrmCard
                        key={o.id}
                        opportunity={o}
                        onEdit={props.canEdit ? setEditing : undefined}
                        draggable={props.canEdit}
                        urgentTask={urgentByOpportunity.get(o.id) ?? null}
                        taskSummary={summarizeOpportunityTasks(tasksByOpportunity.get(o.id) ?? [])}
                        onCompleteTask={props.canEdit ? completeUrgentTask : undefined}
                      />
                    ))}
                  </SortableContext>
                  {colOpps.length === 0 && (
                    <p className="py-4 text-center text-[11px] text-muted-foreground">
                      {filterActive ? 'Nenhum resultado' : 'Vazio'}
                    </p>
                  )}
                </CrmColumn>
                );
              });
            })()}
          </div>
          <DragOverlay>{active && <CrmCard opportunity={active} isOverlay draggable={false} />}</DragOverlay>
        </DndContext>
      </div>

      {frozenOpps.length > 0 && (
        <Card className="mt-4 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Snowflake size={15} className="text-blue-500" /> Congelados ({frozenOpps.length})
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Oportunidade</th>
                <th className="pb-2 font-medium">Motivo</th>
                <th className="pb-2 font-medium">Congelado em</th>
                {props.canEdit && <th className="pb-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {frozenOpps.map((o) => (
                <tr key={o.id} className="border-b border-border/40 last:border-0">
                  <td className="max-w-0 py-2 pr-2">
                    <button
                      type="button"
                      onClick={() => props.canEdit && setEditing(o)}
                      className="block truncate text-left text-foreground hover:text-primary"
                    >
                      {o.title} <span className="text-xs text-muted-foreground">· {o.organization.tradeName ?? o.organization.legalName}</span>
                    </button>
                  </td>
                  <td className="max-w-0 truncate py-2 pr-2 text-xs text-muted-foreground">
                    {o.frozenReason ?? '—'}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-2 text-xs text-muted-foreground">
                    {o.frozenAt ? new Date(o.frozenAt).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  {props.canEdit && (
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => reactivate(o.id)}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-primary hover:underline"
                      >
                        <Sun size={13} /> Reativar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && firstOpen && (
        <OpportunityDialog
          mode="create"
          pipelineId={pipeline.id}
          defaultStageId={firstOpen.id}
          pipelines={props.pipelines}
          users={props.users}
          canEdit={props.canEdit}
          onSaved={onSaved}
          onTasksChanged={reloadTasks}
          onClose={() => setCreating(false)}
        />
      )}

      {editing && (
        <OpportunityDialog
          mode="edit"
          pipelineId={pipeline.id}
          defaultStageId={editing.stageId}
          opportunity={editing}
          pipelines={props.pipelines}
          users={props.users}
          canEdit={props.canEdit}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onTasksChanged={reloadTasks}
          onClose={() => setEditing(null)}
        />
      )}

      {pendingLost && (
        <LostReasonDialog
          onCancel={() => setPendingLost(null)}
          onConfirm={(reason) => {
            const opp = opps.find((o) => o.id === pendingLost.oppId);
            if (opp) commitMove(pendingLost.oppId, pendingLost.stageId, reason || undefined, opp.stageId);
            setPendingLost(null);
          }}
        />
      )}
      </div>
    </div>
  );
}

function PipelineRail({
  pipelines, activeId, onSwitch,
}: { pipelines: PipelineDto[]; activeId: string; onSwitch: (id: string) => void }) {
  return (
    <div className="flex shrink-0 flex-col gap-2 pt-0.5" role="tablist" aria-label="Funis">
      {pipelines.map((p) => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={p.name}
            onClick={() => !active && onSwitch(p.id)}
            className={cn(
              'relative flex h-11 w-11 items-center justify-center rounded-lg border text-xs font-bold uppercase transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input text-muted-foreground hover:border-primary/50 hover:text-foreground',
            )}
          >
            {p.abbreviation || p.name.slice(0, 3).toUpperCase()}
            {p.isDefault && (
              <Star size={9} className="absolute -right-1 -top-1 fill-accent text-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function Metric({
  label, value, tone = 'default',
}: { label: string; value: string; tone?: 'default' | 'success' }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-lg font-bold', tone === 'success' ? 'text-success' : 'text-foreground')}>
        {value}
      </p>
    </Card>
  );
}

function LostReasonDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como perdida</DialogTitle>
        </DialogHeader>
        <div>
          <Label htmlFor="lost-reason">Motivo da perda (opcional)</Label>
          <Textarea
            id="lost-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Ex: preço acima do orçamento do cliente"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onConfirm(reason)}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
