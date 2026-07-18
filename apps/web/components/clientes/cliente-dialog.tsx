'use client';
// Create dialog for Organization with best-effort CNPJ enrichment (decision 6).

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkles, Loader2 } from 'lucide-react';
import type { OrganizationDto } from '@bioinfood/shared';
import { organizationsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

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

  function handleOpenChange(v: boolean) {
    if (!v) {
      reset();
      setEnrichNote('');
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cliente-doc-type">Tipo</Label>
              <Select id="cliente-doc-type" {...register('documentType')}>
                <option value="CNPJ">CNPJ</option>
                <option value="CPF">CPF</option>
                <option value="FOREIGN">Estrangeira</option>
                <option value="OTHER">Outro</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="cliente-doc">
                {documentType === 'FOREIGN' ? 'Documento (opcional)' : 'Documento'}
              </Label>
              <div className="relative">
                <Input
                  id="cliente-doc"
                  {...register('document', { onBlur: (e) => handleCnpjBlur(e.target.value) })}
                  placeholder={documentType === 'CNPJ' ? 'Só números — busca automática' : 'Documento'}
                />
                {enriching && (
                  <Loader2 size={15} className="absolute right-2.5 top-2.5 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          {documentType === 'CNPJ' && (
            <p className="-mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles size={11} /> Digite o CNPJ e saia do campo para preencher automaticamente.
            </p>
          )}
          {enrichNote && <p className="-mt-2 text-[11px] text-primary">{enrichNote}</p>}

          <div>
            <Label htmlFor="cliente-legal-name">Razão social *</Label>
            <Input id="cliente-legal-name" {...register('legalName')} placeholder="Nome jurídico completo" />
            {errors.legalName && <p className="mt-1 text-xs text-destructive">{errors.legalName.message}</p>}
          </div>

          <div>
            <Label htmlFor="cliente-trade-name">Nome fantasia</Label>
            <Input id="cliente-trade-name" {...register('tradeName')} placeholder="Como o cliente é conhecido" />
          </div>

          <p className="-mt-2 text-[11px] text-muted-foreground">
            Cadastro rápido — telefone, e-mail, WhatsApp, redes sociais, contatos e endereço são
            preenchidos na ficha do cliente logo em seguida.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
