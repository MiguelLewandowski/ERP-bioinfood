'use client';
// Create dialog for Organization with best-effort CNPJ enrichment (decision 6).
// Campos completos do spec de Empresa (crm-redesign-2026-07): nome, cnpj,
// razão social, responsável, descrição, categoria, origem, setor,
// produtos e serviço. Sem endereço/contato — isso vive na Pessoa.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  organizationSchema, type OrganizationDto, type OrganizationFormData, type TaxonomyDto,
} from '@bioinfood/shared';
import { organizationsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { MaskedInput } from '@/components/ui/masked-input';
import { maskDocument } from '@/lib/masks';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type FormData = OrganizationFormData;

interface ClienteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (organization: OrganizationDto) => void;
  sectors: TaxonomyDto[];
  sources: TaxonomyDto[];
  categories: TaxonomyDto[];
  productServices: TaxonomyDto[];
}

export default function ClienteDialog({
  open, onOpenChange, onCreated, sectors, sources, categories, productServices,
}: ClienteDialogProps) {
  const { token } = useAuth();
  const [enriching, setEnriching] = useState(false);
  const [enrichNote, setEnrichNote] = useState('');
  const [selectedProductServices, setSelectedProductServices] = useState<string[]>([]);

  const {
    register, handleSubmit, reset, setError, setValue, watch, formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(organizationSchema),
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
        if (result.description) setValue('notes', result.description, { shouldDirty: true });
        setEnrichNote('Dados preenchidos pela Receita — revise antes de salvar.');
      } else {
        setEnrichNote('Não foi possível consultar o CNPJ. Preencha manualmente.');
      }
    } finally {
      setEnriching(false);
    }
  }

  function toggleProductService(id: string) {
    setSelectedProductServices((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  }

  async function onSubmit(data: FormData) {
    try {
      const { sectorId, sourceId, categoryId, ...orgData } = data;
      const organization = await organizationsApi.create({
        ...orgData,
        sectorId: sectorId || undefined,
        sourceId: sourceId || undefined,
        categoryId: categoryId || undefined,
      }, token);

      // Produtos/serviço dependem da empresa já existir — feitos em seguida,
      // best-effort (a empresa já foi criada com sucesso).
      const followUps = selectedProductServices.map(
        (productServiceId) => organizationsApi.addProductService(organization.id, productServiceId, token),
      );
      if (followUps.length > 0) {
        const results = await Promise.allSettled(followUps);
        if (results.some((r) => r.status === 'rejected')) {
          toast.warning('Cliente criado, mas alguns produtos não foram vinculados — ajuste na ficha.');
        }
      }

      reset();
      setSelectedProductServices([]);
      setEnrichNote('');
      onCreated(organization);
    } catch (err) {
      setError('legalName', { message: getErrorMessage(err) });
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      reset();
      setSelectedProductServices([]);
      setEnrichNote('');
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
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
                {documentType === 'FOREIGN' ? 'Documento (opcional)' : 'CNPJ *'}
              </Label>
              <div className="relative">
                <MaskedInput
                  id="cliente-doc"
                  format={maskDocument}
                  {...register('document', { onBlur: (e) => handleCnpjBlur(e.target.value) })}
                  placeholder={documentType === 'CNPJ' ? 'Só números — busca automática' : 'Documento'}
                />
                {enriching && (
                  <Loader2 size={15} className="absolute right-2.5 top-2.5 animate-spin text-muted-foreground" />
                )}
              </div>
              {errors.document && <p className="mt-1 text-xs text-destructive">{errors.document.message}</p>}
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
            <Label htmlFor="cliente-trade-name">Nome</Label>
            <Input id="cliente-trade-name" {...register('tradeName')} placeholder="Como o cliente é conhecido" />
          </div>

          <div>
            <Label htmlFor="cliente-notes">Descrição</Label>
            <Textarea id="cliente-notes" {...register('notes')} rows={2} placeholder="Sobre a empresa…" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="cliente-sector">Setor</Label>
              <Select id="cliente-sector" {...register('sectorId')}>
                <option value="">—</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="cliente-source">Origem</Label>
              <Select id="cliente-source" {...register('sourceId')}>
                <option value="">—</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="cliente-category">Categoria</Label>
              <Select id="cliente-category" {...register('categoryId')}>
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </div>

          <div>
            <Label>Produtos e serviço</Label>
            <div className="flex flex-wrap gap-1.5">
              {productServices.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum cadastrado — configure em Configurações do CRM.</p>
              )}
              {productServices.map((ps) => {
                const active = selectedProductServices.includes(ps.id);
                return (
                  <button
                    key={ps.id}
                    type="button"
                    onClick={() => toggleProductService(ps.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {ps.name}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Empresa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
