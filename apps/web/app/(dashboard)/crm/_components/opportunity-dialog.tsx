'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Trash2, ExternalLink } from 'lucide-react';
import type { OpportunityDto } from '@bioinfood/shared';
import { opportunitiesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { OrganizationSelect } from '@/components/shared/organization-select';

const inputCls =
  'w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none';

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
  expectedCloseDate: string;
}

export function OpportunityDialog({
  mode, pipelineId, defaultStageId, opportunity, onSaved, onDeleted, onClose,
}: OpportunityDialogProps) {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: opportunity?.title ?? '',
      clientId: opportunity?.organization.id ?? '',
      amount: opportunity?.amount ?? '',
      expectedCloseDate: opportunity?.expectedCloseDate?.slice(0, 10) ?? '',
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
        expectedCloseDate: v.expectedCloseDate || undefined,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#1D1D1B]">
            {mode === 'create' ? 'Nova Oportunidade' : 'Editar Oportunidade'}
          </h2>
          <button onClick={onClose} className="text-[#706F6F] hover:text-[#575756]" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {mode === 'edit' && opportunity && (
          <Link
            href={`/clientes/${opportunity.organization.id}`}
            className="mb-4 -mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#147F23] hover:underline"
          >
            Ver ficha completa do cliente <ExternalLink size={12} />
          </Link>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[#575756] mb-1">Título *</label>
            <input {...register('title', { required: true })} className={inputCls} placeholder="Ex: Projeto Levedura" />
            {errors.title && <p className="text-xs text-red-500 mt-1">Título é obrigatório</p>}
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">Cliente *</label>
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
              <label className="block text-sm font-medium text-[#575756] mb-1">Valor (R$)</label>
              <input {...register('amount')} type="number" min={0} step="0.01" className={inputCls} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">Previsão de fechamento</label>
              <input {...register('expectedCloseDate')} type="date" className={inputCls} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 size={15} /> Excluir
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-[#575756] border border-gray-200 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] disabled:opacity-60"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
