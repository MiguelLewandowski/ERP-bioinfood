'use client'; // kanban with drag-and-drop requires client interaction

import { useState } from 'react';
import Link from 'next/link';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { PipelineDto, OpportunityDto, PipelineSummaryDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { opportunitiesApi, pipelinesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CrmColumn } from './crm-column';
import { CrmCard, formatBRL } from './crm-card';
import { OpportunityDialog } from './opportunity-dialog';

interface CrmClientProps {
  pipelines: PipelineDto[];
  currentPipeline: PipelineDto | null;
  initialOpportunities: OpportunityDto[];
  summary: PipelineSummaryDto | null;
  canEdit: boolean;
}

export function CrmClient(props: CrmClientProps) {
  const { token } = useAuth();
  const [pipeline, setPipeline] = useState(props.currentPipeline);
  const [opps, setOpps] = useState(props.initialOpportunities);
  const [summary, setSummary] = useState(props.summary);
  const [active, setActive] = useState<OpportunityDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OpportunityDto | null>(null);
  const [pendingLost, setPendingLost] = useState<{ oppId: string; stageId: string } | null>(null);

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
    const targetType = stages.find((s) => s.id === targetStageId)?.type;
    const opp = opps.find((o) => o.id === oppId);
    if (!opp || opp.stageId === targetStageId) return;

    // Losing a deal asks for a reason before committing the move.
    if (targetType === 'LOST') {
      setPendingLost({ oppId, stageId: targetStageId });
      return;
    }
    await commitMove(oppId, targetStageId, undefined, opp.stageId);
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
      const exists = prev.some((o) => o.id === saved.id);
      return exists ? prev.map((o) => (o.id === saved.id ? saved : o)) : [saved, ...prev];
    });
    if (pipeline) refreshSummary(pipeline.id);
  }

  function onDeleted(id: string) {
    setOpps((prev) => prev.filter((o) => o.id !== id));
    if (pipeline) refreshSummary(pipeline.id);
  }

  if (!pipeline) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nenhum funil configurado.
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {props.pipelines.length > 1 ? (
            <Select
              value={pipeline.id}
              onChange={(e) => switchPipeline(e.target.value)}
              className="w-auto"
              aria-label="Funil"
            >
              {props.pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (padrão)' : ''}</option>
              ))}
            </Select>
          ) : (
            <span className="text-sm font-semibold text-foreground">{pipeline.name}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {props.canEdit && (
            <Link href="/crm/config" className={cn(buttonVariants({ variant: 'outline' }))}>
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

      {summary && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Em aberto" value={formatBRL(summary.openTotal)} />
          <Metric label="Ponderado" value={formatBRL(summary.weightedTotal)} />
          <Metric label="Conversão" value={`${Math.round(summary.conversionRate * 100)}%`} />
          <Metric label="Ganhos / Perdidos" value={`${summary.wonCount} / ${summary.lostCount}`} />
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid items-start gap-3" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(220px, 1fr))` }}>
            {stages.map((stage) => {
              const colOpps = opps.filter((o) => o.stageId === stage.id);
              return (
                <CrmColumn key={stage.id} stage={stage} count={colOpps.length} amount={stageAmount(stage.id)}>
                  <SortableContext items={colOpps.map((o) => o.id)} strategy={verticalListSortingStrategy}>
                    {colOpps.map((o) => (
                      <CrmCard key={o.id} opportunity={o} onEdit={props.canEdit ? setEditing : undefined} draggable={props.canEdit} />
                    ))}
                  </SortableContext>
                  {colOpps.length === 0 && (
                    <p className="py-4 text-center text-[11px] text-muted-foreground">Vazio</p>
                  )}
                </CrmColumn>
              );
            })}
          </div>
          <DragOverlay>{active && <CrmCard opportunity={active} isOverlay draggable={false} />}</DragOverlay>
        </DndContext>
      </div>

      {creating && firstOpen && (
        <OpportunityDialog
          mode="create"
          pipelineId={pipeline.id}
          defaultStageId={firstOpen.id}
          onSaved={onSaved}
          onClose={() => setCreating(false)}
        />
      )}

      {editing && (
        <OpportunityDialog
          mode="edit"
          pipelineId={pipeline.id}
          defaultStageId={editing.stageId}
          opportunity={editing}
          onSaved={onSaved}
          onDeleted={onDeleted}
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
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-foreground">{value}</p>
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
