'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Trash2, ExternalLink, Snowflake, Sun,
} from 'lucide-react';
import type { OpportunityDto } from '@bioinfood/shared';
import { opportunitiesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { OrganizationSelect } from '@/components/shared/organization-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OpportunityTasksSection } from './opportunity-tasks-section';

interface OpportunityDialogProps {
  mode: 'create' | 'edit';
  pipelineId: string;
  defaultStageId: string;
  opportunity?: OpportunityDto;
  onSaved: (o: OpportunityDto) => void;
  onDeleted?: (id: string) => void;
  onClose: () => void;
}

interface FormValues {
  title: string;
  clientId: string;
  amount: string;
  startDate: string;
  expectedCloseDate: string;
  description: string;
}

export function OpportunityDialog({
  mode, pipelineId, defaultStageId, opportunity, onSaved, onDeleted, onClose,
}: OpportunityDialogProps) {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(opportunity);
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: opportunity?.title ?? '',
      clientId: opportunity?.organization.id ?? '',
      amount: opportunity?.amount ?? '',
      startDate: opportunity?.startDate?.slice(0, 10) ?? '',
      expectedCloseDate: opportunity?.expectedCloseDate?.slice(0, 10) ?? '',
      description: opportunity?.description ?? '',
    },
  });

  async function onSubmit(v: FormValues) {
    if (mode === 'create' && !v.clientId) {
      toast.error('Selecione o cliente');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: v.title,
        amount: v.amount === '' ? undefined : Number(v.amount),
        startDate: v.startDate || undefined,
        expectedCloseDate: v.expectedCloseDate || undefined,
        description: v.description || undefined,
      };
      const saved = mode === 'create'
        ? await opportunitiesApi.create(
            { ...payload, orgId: v.clientId, pipelineId, stageId: defaultStageId }, token,
          )
        : await opportunitiesApi.update(opportunity!.id, payload, token);
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!opportunity) return;
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
    setSaving(true);
    try {
      const saved = current.frozenAt
        ? await opportunitiesApi.unfreeze(current.id, token)
        : await opportunitiesApi.freeze(current.id, token);
      setCurrent(saved);
      onSaved(saved);
      toast.success(saved.frozenAt ? 'Negócio congelado' : 'Negócio reativado');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
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

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="opp-title">Título *</Label>
            <Input
              id="opp-title"
              {...register('title', { required: true })}
              placeholder="Ex: Projeto Levedura"
            />
            {errors.title && <p className="mt-1 text-xs text-destructive">Título é obrigatório</p>}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="opp-amount">Valor (R$)</Label>
              <Input id="opp-amount" {...register('amount')} type="number" min={0} step="0.01" placeholder="0,00" />
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
            <Textarea id="opp-description" {...register('description')} rows={3} placeholder="Sobre o negócio…" />
          </div>

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
                <Button type="button" variant="outline" onClick={toggleFreeze} disabled={saving}>
                  {current?.frozenAt ? <Sun size={15} /> : <Snowflake size={15} />}
                  {current?.frozenAt ? 'Reativar' : 'Congelar'}
                </Button>
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

        {mode === 'edit' && current && (
          <OpportunityTasksSection opportunityId={current.id} orgId={current.organization.id} />
        )}
      </DialogContent>
    </Dialog>
  );
}
