'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, Plus, X } from 'lucide-react';
import type {
  OrganizationDetailDto, TaxonomyDto, PartyRoleType,
} from '@bioinfood/shared';
import { organizationsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { MaskedInput } from '@/components/ui/masked-input';
import { maskDocument, maskCNAE } from '@/lib/masks';

const ROLE_LABELS: Record<PartyRoleType, string> = {
  CUSTOMER: 'Cliente',
  SUPPLIER: 'Fornecedor',
  CARRIER: 'Transportadora',
  PARTNER: 'Parceiro',
  FUNDING_AGENCY: 'Agência de fomento',
  RESEARCH_INSTITUTION: 'Instituição de pesquisa',
};

const inputCls =
  'w-full text-sm px-3 py-2.5 border border-border rounded-lg focus:border-ring focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed';

interface DadosTabProps {
  organizationId: string;
  organization: OrganizationDetailDto;
  sectors: TaxonomyDto[];
  sources: TaxonomyDto[];
  categories: TaxonomyDto[];
  productServices: TaxonomyDto[];
  canEdit: boolean;
  canManageRoles: boolean;
}

// Empresa não guarda contato próprio: quem tem e-mail e telefone são as pessoas
// vinculadas, na aba Contatos. As colunas continuam no banco, sem uso pela tela.
interface FormValues {
  legalName: string;
  tradeName: string;
  document: string;
  documentType: string;
  status: string;
  sectorId: string;
  sourceId: string;
  categoryId: string;
  cnae: string;
  website: string;
  notes: string;
  linkedin: string;
}

export function DadosTab(props: DadosTabProps) {
  const {
    organizationId, organization, sectors, sources, categories, productServices, canEdit, canManageRoles,
  } = props;
  const { token } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, formState: { isDirty, errors } } = useForm<FormValues>({
    defaultValues: {
      legalName: organization.legalName,
      tradeName: organization.tradeName ?? '',
      document: organization.document ?? '',
      documentType: organization.documentType ?? 'CNPJ',
      status: organization.status,
      sectorId: organization.sectorId ?? '',
      sourceId: organization.sourceId ?? '',
      categoryId: organization.categoryId ?? '',
      cnae: organization.cnae ?? '',
      website: organization.website ?? '',
      notes: organization.notes ?? '',
      linkedin: organization.linkedin ?? '',
    },
  });

  async function onSubmit(v: FormValues) {
    setSaving(true);
    try {
      await organizationsApi.update(organizationId, {
        ...v,
        sectorId: v.sectorId || null,
        sourceId: v.sourceId || null,
        categoryId: v.categoryId || null,
      }, token);
      toast.success('Dados salvos');
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <section className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">Identificação</h2>

          <Field label="Razão Social *">
            <input {...register('legalName')} disabled={!canEdit} className={inputCls} />
          </Field>
          <Field label="Nome Fantasia">
            <input {...register('tradeName')} disabled={!canEdit} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de documento">
              <select {...register('documentType')} disabled={!canEdit} className={inputCls}>
                <option value="CNPJ">CNPJ</option>
                <option value="CPF">CPF</option>
                <option value="FOREIGN">Estrangeiro</option>
                <option value="OTHER">Outro</option>
              </select>
            </Field>
            <Field label={watch('documentType') === 'FOREIGN' ? 'Documento (opcional)' : 'Documento *'}>
              <MaskedInput
                format={maskDocument}
                {...register('document', {
                  required: watch('documentType') !== 'FOREIGN' ? 'CNPJ é obrigatório (ou marque como estrangeira)' : false,
                })}
                disabled={!canEdit}
                className={inputCls}
              />
              {errors.document && <p className="mt-1 text-xs text-destructive">{errors.document.message}</p>}
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Setor">
              <select {...register('sectorId')} disabled={!canEdit} className={inputCls}>
                <option value="">—</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Origem">
              <select {...register('sourceId')} disabled={!canEdit} className={inputCls}>
                <option value="">—</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Categoria">
              <select {...register('categoryId')} disabled={!canEdit} className={inputCls}>
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status do cadastro">
              <select {...register('status')} disabled={!canEdit} className={inputCls}>
                <option value="ACTIVE">Ativo</option>
                <option value="ARCHIVED">Arquivado</option>
              </select>
            </Field>
            <Field label="CNAE">
              <MaskedInput format={maskCNAE} {...register('cnae')} disabled={!canEdit} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Website">
              <input {...register('website')} disabled={!canEdit} placeholder="https://…" className={inputCls} />
            </Field>
            <Field label="LinkedIn">
              <input {...register('linkedin')} disabled={!canEdit} className={inputCls} />
            </Field>
          </div>
          <Field label="Descrição">
            <textarea {...register('notes')} disabled={!canEdit} rows={3} className={inputCls} />
          </Field>

          {organization.registrationStatus !== 'UNKNOWN' && (
            <p className="text-xs text-muted-foreground">
              Situação cadastral (Receita): <strong>{organization.registrationStatus}</strong>
            </p>
          )}

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !isDirty}>
                <Save size={15} /> {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          )}
        </section>
      </form>

      <RolesSection
        organizationId={organizationId}
        roles={organization.roles}
        canManage={canManageRoles}
      />

      <ProductServicesSection
        organizationId={organizationId}
        options={productServices}
        selected={organization.productServices}
        canEdit={canEdit}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function RolesSection({
  organizationId, roles, canManage,
}: { organizationId: string; roles: OrganizationDetailDto['roles']; canManage: boolean }) {
  const { token } = useAuth();
  const router = useRouter();
  const existing = new Set(roles.map((r) => r.type));
  const available = (Object.keys(ROLE_LABELS) as PartyRoleType[]).filter((t) => !existing.has(t));
  const [adding, setAdding] = useState('');

  async function add(type: string) {
    try {
      await organizationsApi.addRole(organizationId, type, token);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function remove(type: string) {
    try {
      await organizationsApi.removeRole(organizationId, type, token);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <section className="bg-card rounded-xl border border-border p-5">
      <h2 className="text-sm font-bold text-foreground border-b border-border pb-2 mb-3">Papéis</h2>
      <div className="flex flex-wrap items-center gap-2">
        {roles.length === 0 && <span className="text-xs text-muted-foreground">Nenhum papel atribuído.</span>}
        {roles.map((r) => (
          <span
            key={r.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-3 py-1 text-xs font-medium text-primary-dark"
          >
            {ROLE_LABELS[r.type]}
            {canManage && (
              <button onClick={() => remove(r.type)} className="text-primary-dark hover:text-red-600" aria-label="Remover papel">
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {canManage && available.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <select
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1 focus:border-ring focus:outline-none"
            >
              <option value="">+ papel…</option>
              {available.map((t) => <option key={t} value={t}>{ROLE_LABELS[t]}</option>)}
            </select>
            {adding && (
              <button
                onClick={() => { add(adding); setAdding(''); }}
                className="rounded-lg bg-primary p-1 text-primary-foreground transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Adicionar papel"
              >
                <Plus size={13} />
              </button>
            )}
          </span>
        )}
      </div>
    </section>
  );
}

function ProductServicesSection({
  organizationId, options, selected, canEdit,
}: {
  organizationId: string;
  options: TaxonomyDto[];
  selected: OrganizationDetailDto['productServices'];
  canEdit: boolean;
}) {
  const { token } = useAuth();
  const router = useRouter();
  const selectedIds = new Set(selected.map((s) => s.id));
  const available = options.filter((o) => !selectedIds.has(o.id));
  const [adding, setAdding] = useState('');

  async function add(productServiceId: string) {
    try {
      await organizationsApi.addProductService(organizationId, productServiceId, token);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function remove(productServiceId: string) {
    try {
      await organizationsApi.removeProductService(organizationId, productServiceId, token);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <section className="bg-card rounded-xl border border-border p-5">
      <h2 className="text-sm font-bold text-foreground border-b border-border pb-2 mb-3">Produtos e serviços</h2>
      <div className="flex flex-wrap items-center gap-2">
        {selected.length === 0 && <span className="text-xs text-muted-foreground">Nenhum produto/serviço vinculado.</span>}
        {selected.map((ps) => (
          <span
            key={ps.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-3 py-1 text-xs font-medium text-primary-dark"
          >
            {ps.name}
            {canEdit && (
              <button onClick={() => remove(ps.id)} className="text-primary-dark hover:text-red-600" aria-label="Remover produto/serviço">
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {canEdit && available.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <select
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1 focus:border-ring focus:outline-none"
            >
              <option value="">+ produto/serviço…</option>
              {available.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {adding && (
              <button
                onClick={() => { add(adding); setAdding(''); }}
                className="rounded-lg bg-primary p-1 text-primary-foreground transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Adicionar produto/serviço"
              >
                <Plus size={13} />
              </button>
            )}
          </span>
        )}
      </div>
    </section>
  );
}
