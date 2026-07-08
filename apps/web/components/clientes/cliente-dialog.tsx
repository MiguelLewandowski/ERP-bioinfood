'use client';
// Create dialog for Organization with best-effort CNPJ enrichment (decision 6).

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Sparkles, Loader2 } from 'lucide-react';
import type { OrganizationDto } from '@bioinfood/shared';
import { organizationsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';

const schema = z.object({
  legalName: z.string().min(1, 'Razão social é obrigatória').max(200, 'Máximo de 200 caracteres'),
  tradeName: z.string().max(200, 'Máximo de 200 caracteres').optional(),
  document: z.string().max(20, 'Máximo de 20 caracteres').optional(),
  documentType: z.enum(['CNPJ', 'CPF', 'FOREIGN', 'OTHER']),
});

type FormData = z.infer<typeof schema>;

interface ClienteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (organization: OrganizationDto) => void;
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]';

export default function ClienteDialog({ open, onOpenChange, onCreated }: ClienteDialogProps) {
  const { token } = useAuth();
  const [enriching, setEnriching] = useState(false);
  const [enrichNote, setEnrichNote] = useState('');

  const {
    register, handleSubmit, reset, setError, setValue, watch, formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { documentType: 'CNPJ' },
  });

  const documentType = watch('documentType');

  if (!open) return null;

  // Best-effort prefill: on blur of a 14-digit CNPJ, ask the API and fill fields.
  async function handleCnpjBlur(value: string) {
    const digits = value.replace(/\D/g, '');
    if (documentType !== 'CNPJ' || digits.length !== 14) return;
    setEnriching(true);
    setEnrichNote('');
    try {
      const result = await organizationsApi.enrich(digits, token);
      if (result.enriched) {
        if (result.legalName) setValue('legalName', result.legalName, { shouldDirty: true });
        if (result.tradeName) setValue('tradeName', result.tradeName, { shouldDirty: true });
        setEnrichNote('Dados preenchidos pela Receita — revise antes de salvar.');
      } else {
        setEnrichNote('Não foi possível consultar o CNPJ. Preencha manualmente.');
      }
    } finally {
      setEnriching(false);
    }
  }

  async function onSubmit(data: FormData) {
    try {
      const organization = await organizationsApi.create(data, token);
      reset();
      setEnrichNote('');
      onCreated(organization);
    } catch (err) {
      setError('legalName', { message: getErrorMessage(err) });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#1D1D1B]">Novo Cliente</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#706F6F] hover:text-[#575756] focus:outline-none focus:ring-2 focus:ring-[#52B552] rounded"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">Tipo</label>
              <select {...register('documentType')} className={inputCls}>
                <option value="CNPJ">CNPJ</option>
                <option value="CPF">CPF</option>
                <option value="FOREIGN">Estrangeira</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">
                {documentType === 'FOREIGN' ? 'Documento (opcional)' : 'Documento'}
              </label>
              <div className="relative">
                <input
                  {...register('document', { onBlur: (e) => handleCnpjBlur(e.target.value) })}
                  className={inputCls}
                  placeholder={documentType === 'CNPJ' ? 'Só números — busca automática' : 'Documento'}
                />
                {enriching && (
                  <Loader2 size={15} className="absolute right-2.5 top-2.5 animate-spin text-[#878787]" />
                )}
              </div>
            </div>
          </div>

          {documentType === 'CNPJ' && (
            <p className="-mt-2 flex items-center gap-1 text-[11px] text-[#878787]">
              <Sparkles size={11} /> Digite o CNPJ e saia do campo para preencher automaticamente.
            </p>
          )}
          {enrichNote && <p className="-mt-2 text-[11px] text-[#147F23]">{enrichNote}</p>}

          <div>
            <label className="block text-sm font-medium text-[#575756] mb-1">Razão social *</label>
            <input {...register('legalName')} className={inputCls} placeholder="Nome jurídico completo" />
            {errors.legalName && <p className="text-xs text-red-500 mt-1">{errors.legalName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#575756] mb-1">Nome fantasia</label>
            <input {...register('tradeName')} className={inputCls} placeholder="Como o cliente é conhecido" />
          </div>

          <p className="-mt-2 text-[11px] text-[#878787]">
            Cadastro rápido — telefone, e-mail, WhatsApp, redes sociais, contatos e endereço são
            preenchidos na ficha do cliente logo em seguida.
          </p>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => { reset(); setEnrichNote(''); onOpenChange(false); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#575756] border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              {isSubmitting ? 'Criando...' : 'Criar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
