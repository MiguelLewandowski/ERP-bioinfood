'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Trash2, ExternalLink, Snowflake, Sun,
} from 'lucide-react';
import {
  opportunitySchema, type OpportunityDto, type OpportunityFormData, type PipelineDto, type UserDto,
  type ContactListItemDto,
} from '@bioinfood/shared';
import { opportunitiesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { OrganizationSelect } from '@/components/shared/organization-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MaskedInput } from '@/components/ui/masked-input';
import { maskCurrencyBRL, parseCurrencyBRL, formatCurrencyForInput } from '@/lib/masks';
import { useFormDraft, clearFormDraft } from '@/lib/use-form-draft';
import { OpportunityTasksSection } from './opportunity-tasks-section';
import { OpportunityTimeline } from './opportunity-timeline';

interface OpportunityDialogProps {
  mode: 'create' | 'edit';
  pipelineId: string;
  defaultStageId: string;
  opportunity?: OpportunityDto;
  pipelines: PipelineDto[];
  users: UserDto[];
  contacts: ContactListItemDto[];
  canEdit: boolean;
  onSaved: (o: OpportunityDto) => void;
  onDeleted?: (id: string) => void;
  onTasksChanged?: () => void;
  onClose: () => void;
}

export function OpportunityDialog({
  mode, pipelineId, defaultStageId, opportunity, pipelines, users, contacts, canEdit,
  onSaved, onDeleted, onTasksChanged, onClose,
}: OpportunityDialogProps) {
  const { token } = useAuth();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(opportunity);
  const [freezePrompt, setFreezePrompt] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');
  const [movePipelineId, setMovePipelineId] = useState(opportunity?.pipeline.id ?? pipelineId);
  const [moveStageId, setMoveStageId] = useState(opportunity?.stageId ?? defaultStageId);
  const [moving, setMoving] = useState(false);
  const moveStages = (pipelines.find((p) => p.id === movePipelineId)?.stages ?? [])
    .filter((s) => s.isActive)
    .sort((a, b) => a.order - b.order);
  const defaultValues: OpportunityFormData = {
    title: opportunity?.title ?? '',
    clientId: opportunity?.organization.id ?? '',
    responsibleId: opportunity?.responsible?.id ?? '',
    amount: formatCurrencyForInput(opportunity?.amount),
    startDate: opportunity?.startDate?.slice(0, 10) ?? '',
    expectedCloseDate: opportunity?.expectedCloseDate?.slice(0, 10) ?? '',
    description: opportunity?.description ?? '',
  };
  const {
    register, handleSubmit, control, watch, reset, formState: { errors },
  } = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues,
  });

  // Só rascunho de criação — editar já parte de dado real do servidor.
  const draftKey = mode === 'create' ? `draft:opportunity:${pipelineId}` : null;
  useFormDraft(draftKey, watch, reset, defaultValues);

  async function onSubmit(v: OpportunityFormData) {
    if (mode === 'create' && !v.clientId) {
      toast.error('Selecione o cliente');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: v.title,
        responsibleId: v.responsibleId || undefined,
        amount: parseCurrencyBRL(v.amount ?? ''),
        startDate: v.startDate || undefined,
        expectedCloseDate: v.expectedCloseDate || undefined,
        description: v.description || undefined,
      };
      const saved = mode === 'create'
        ? await opportunitiesApi.create(
            { ...payload, orgId: v.clientId, pipelineId: movePipelineId, stageId: moveStageId }, token,
          )
        : await opportunitiesApi.update(opportunity!.id, payload, token);
      onSaved(saved);
      if (draftKey) clearFormDraft(draftKey);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!opportunity) return;
    const ok = await confirm({
      title: 'Excluir oportunidade',
      description: `"${opportunity.title}" e as tarefas vinculadas serão removidos. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await opportunitiesApi.remove(opportunity.id, token);
      onDeleted?.(opportunity.id);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleFreeze() {
    if (!current) return;
    // Descongelar não precisa de motivo — só congelar pede o porquê.
    if (!current.frozenAt) {
      setFreezePrompt(true);
      return;
    }
    setSaving(true);
    try {
      const saved = await opportunitiesApi.unfreeze(current.id, token);
      setCurrent(saved);
      onSaved(saved);
      toast.success('Oportunidade reativada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function onMovePipelineChange(id: string) {
    setMovePipelineId(id);
    const firstStage = (pipelines.find((p) => p.id === id)?.stages ?? [])
      .filter((s) => s.isActive)
      .sort((a, b) => a.order - b.order)[0];
    setMoveStageId(firstStage?.id ?? '');
  }

  async function handleMove() {
    if (!current || !moveStageId) return;
    setMoving(true);
    try {
      const saved = await opportunitiesApi.move(current.id, moveStageId, token);
      setCurrent(saved);
      onSaved(saved);
      toast.success('Oportunidade movida');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMoving(false);
    }
  }

  async function confirmFreeze() {
    if (!current) return;
    setSaving(true);
    try {
      const saved = await opportunitiesApi.freeze(current.id, freezeReason.trim() || undefined, token);
      setCurrent(saved);
      onSaved(saved);
      setFreezePrompt(false);
      setFreezeReason('');
      toast.success('Oportunidade congelada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={mode === 'edit' ? 'sm:max-w-4xl' : undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'create' ? 'Nova Oportunidade' : 'Editar Oportunidade'}
            {current?.frozenAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                <Snowflake size={11} /> Congelado
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {mode === 'edit' && opportunity && (
          <Link
            href={`/crm/empresas/${opportunity.organization.id}`}
            className="-mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver ficha completa do cliente <ExternalLink size={12} />
          </Link>
        )}

        <div className={mode === 'edit' && current ? 'grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start' : undefined}>
          {mode === 'edit' && current && (
            <OpportunityTimeline
              opportunityId={current.id}
              contacts={contacts}
              canEdit={canEdit}
            />
          )}

          <div className="flex min-w-0 flex-col gap-4">
            {mode === 'edit' && current && (
              <OpportunityTasksSection
                opportunityId={current.id}
                orgId={current.organization.id}
                users={users}
                canEdit={canEdit}
                onTasksChanged={onTasksChanged}
              />
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className={mode === 'edit' && current ? 'flex flex-col gap-4 border-t border-border pt-4' : 'flex flex-col gap-4'}
            >
              <div>
                <Label htmlFor="opp-title">Título *</Label>
                <Input
                  id="opp-title"
                  {...register('title')}
                  placeholder="Ex: Projeto Levedura"
                />
                {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
              </div>
    
              {mode === 'create' && (
                <div>
                  <Label>Cliente *</Label>
                  <Controller
                    name="clientId"
                    control={control}
                    render={({ field }) => (
                      <OrganizationSelect token={token} value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
              )}
    
              {mode === 'create' && pipelines.length > 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="opp-pipeline">Funil</Label>
                    <Select id="opp-pipeline" value={movePipelineId} onChange={(e) => onMovePipelineChange(e.target.value)}>
                      {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="opp-stage">Etapa</Label>
                    <Select id="opp-stage" value={moveStageId} onChange={(e) => setMoveStageId(e.target.value)}>
                      {moveStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                  </div>
                </div>
              )}
    
              <div>
                <Label htmlFor="opp-responsible">Responsável</Label>
                <Select id="opp-responsible" {...register('responsibleId')}>
                  <option value="">—</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </div>
    
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="opp-amount">Valor (R$)</Label>
                  <MaskedInput id="opp-amount" format={maskCurrencyBRL} {...register('amount')} placeholder="0,00" />
                </div>
                <div>
                  <Label htmlFor="opp-start-date">Data de início</Label>
                  <Input id="opp-start-date" {...register('startDate')} type="date" />
                </div>
              </div>
              <div>
                <Label htmlFor="opp-date">Previsão de fechamento</Label>
                <Input id="opp-date" {...register('expectedCloseDate')} type="date" />
              </div>
              <div>
                <Label htmlFor="opp-description">Descrição</Label>
                <Textarea id="opp-description" {...register('description')} rows={3} placeholder="Sobre a oportunidade…" />
              </div>
    
              {mode === 'edit' && current && pipelines.length > 1 && (
                <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-md border border-border/60 p-3">
                  <div>
                    <Label htmlFor="opp-move-pipeline">Funil</Label>
                    <Select id="opp-move-pipeline" value={movePipelineId} onChange={(e) => onMovePipelineChange(e.target.value)}>
                      {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="opp-move-stage">Etapa</Label>
                    <Select id="opp-move-stage" value={moveStageId} onChange={(e) => setMoveStageId(e.target.value)}>
                      {moveStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={moving || (movePipelineId === current.pipeline.id && moveStageId === current.stageId)}
                    onClick={handleMove}
                  >
                    {moving ? 'Movendo…' : 'Mover'}
                  </Button>
                </div>
              )}
    
              {current?.frozenAt && !freezePrompt && (
                <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Congelado em {new Date(current.frozenAt).toLocaleDateString('pt-BR')}
                  {current.frozenReason ? ` — ${current.frozenReason}` : ' — sem motivo informado'}
                </p>
              )}
    
              {freezePrompt && (
                <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                  <Label htmlFor="freeze-reason">Motivo do congelamento</Label>
                  <Textarea
                    id="freeze-reason"
                    rows={2}
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    placeholder="Ex: aguardando orçamento do cliente"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { setFreezePrompt(false); setFreezeReason(''); }}>
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" onClick={confirmFreeze} disabled={saving}>
                      <Snowflake size={14} /> Congelar
                    </Button>
                  </div>
                </div>
              )}
    
              <div className="flex items-center justify-between gap-2 pt-2">
                {mode === 'edit' ? (
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDelete}
                      disabled={saving}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={15} /> Excluir
                    </Button>
                    {!freezePrompt && (
                      <Button type="button" variant="outline" onClick={toggleFreeze} disabled={saving}>
                        {current?.frozenAt ? <Sun size={15} /> : <Snowflake size={15} />}
                        {current?.frozenAt ? 'Reativar' : 'Congelar'}
                      </Button>
                    )}
                  </div>
                ) : <span />}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
