'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, Plus, X } from 'lucide-react';
import type {
  OrganizationDetailDto, TaxonomyDto, OrgAddressDto, PartyRoleType, UserDto,
} from '@bioinfood/shared';
import { organizationsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';

const ROLE_LABELS: Record<PartyRoleType, string> = {
  CUSTOMER: 'Cliente',
  SUPPLIER: 'Fornecedor',
  CARRIER: 'Transportadora',
  PARTNER: 'Parceiro',
  FUNDING_AGENCY: 'Agência de fomento',
  RESEARCH_INSTITUTION: 'Instituição de pesquisa',
};

const STAGE_OPTIONS = [
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'VIP', label: 'VIP' },
];

const inputCls =
  'w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-ring focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed';

interface DadosTabProps {
  organizationId: string;
  organization: OrganizationDetailDto;
  sectors: TaxonomyDto[];
  sources: TaxonomyDto[];
  categories: TaxonomyDto[];
  productServices: TaxonomyDto[];
  users: UserDto[];
  canEdit: boolean;
  canManageRoles: boolean;
}

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
  email: string;
  phone: string;
  mobile: string;
  whatsapp: string;
  fax: string;
  ramal: string;
  facebook: string;
  twitter: string;
  linkedin: string;
  skype: string;
  instagram: string;
}

export function DadosTab(props: DadosTabProps) {
  const {
    organizationId, organization, sectors, sources, categories, productServices, users, canEdit, canManageRoles,
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
      email: organization.email ?? '',
      phone: organization.phone ?? '',
      mobile: organization.mobile ?? '',
      whatsapp: organization.whatsapp ?? '',
      fax: organization.fax ?? '',
      ramal: organization.ramal ?? '',
      facebook: organization.facebook ?? '',
      twitter: organization.twitter ?? '',
      linkedin: organization.linkedin ?? '',
      skype: organization.skype ?? '',
      instagram: organization.instagram ?? '',
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
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground border-b border-gray-100 pb-2">Identificação</h2>

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
              <input
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
              <input {...register('cnae')} disabled={!canEdit} className={inputCls} />
            </Field>
          </div>

          <Field label="Website">
            <input {...register('website')} disabled={!canEdit} placeholder="https://…" className={inputCls} />
          </Field>
          <Field label="Descrição">
            <textarea {...register('notes')} disabled={!canEdit} rows={3} className={inputCls} />
          </Field>

          {organization.registrationStatus !== 'UNKNOWN' && (
            <p className="text-xs text-muted-foreground">
              Situação cadastral (Receita): <strong>{organization.registrationStatus}</strong>
            </p>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground border-b border-gray-100 pb-2">Contato</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail">
              <input {...register('email')} disabled={!canEdit} className={inputCls} />
            </Field>
            <Field label="Telefone">
              <input {...register('phone')} disabled={!canEdit} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Celular">
              <input {...register('mobile')} disabled={!canEdit} className={inputCls} />
            </Field>
            <Field label="WhatsApp">
              <input {...register('whatsapp')} disabled={!canEdit} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fax">
              <input {...register('fax')} disabled={!canEdit} className={inputCls} />
            </Field>
            <Field label="Ramal">
              <input {...register('ramal')} disabled={!canEdit} className={inputCls} />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground border-b border-gray-100 pb-2">Redes sociais</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="LinkedIn">
              <input {...register('linkedin')} disabled={!canEdit} className={inputCls} />
            </Field>
            <Field label="Instagram">
              <input {...register('instagram')} disabled={!canEdit} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Facebook">
              <input {...register('facebook')} disabled={!canEdit} className={inputCls} />
            </Field>
            <Field label="Twitter">
              <input {...register('twitter')} disabled={!canEdit} className={inputCls} />
            </Field>
          </div>
          <Field label="Skype">
            <input {...register('skype')} disabled={!canEdit} className={inputCls} />
          </Field>

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || !isDirty}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
              >
                <Save size={15} /> {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          )}
        </section>
      </form>

      <RolesSection
        organizationId={organizationId}
        roles={organization.roles}
        canManage={canManageRoles}
      />

      <CustomerProfileSection
        organizationId={organizationId}
        profile={organization.customerProfile}
        users={users}
        canEdit={canEdit}
      />

      <ProductServicesSection
        organizationId={organizationId}
        options={productServices}
        selected={organization.productServices}
        canEdit={canEdit}
      />

      <AddressesSection
        organizationId={organizationId}
        addresses={organization.addresses}
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
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-foreground border-b border-gray-100 pb-2 mb-3">Papéis</h2>
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
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:border-ring focus:outline-none"
            >
              <option value="">+ papel…</option>
              {available.map((t) => <option key={t} value={t}>{ROLE_LABELS[t]}</option>)}
            </select>
            {adding && (
              <button
                onClick={() => { add(adding); setAdding(''); }}
                className="rounded-lg p-1 text-white"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
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

function CustomerProfileSection({
  organizationId, profile, users, canEdit,
}: {
  organizationId: string;
  profile: OrganizationDetailDto['customerProfile'];
  users: UserDto[];
  canEdit: boolean;
}) {
  const { token } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      stage: profile?.stage ?? 'PROSPECT',
      paymentTerms: profile?.paymentTerms ?? '',
      creditLimit: profile?.creditLimit ?? '',
      salesRepId: profile?.salesRepId ?? '',
    },
  });

  async function onSubmit(v: { stage: string; paymentTerms: string; creditLimit: string; salesRepId: string }) {
    setSaving(true);
    try {
      await organizationsApi.saveCustomerProfile(organizationId, {
        stage: v.stage,
        paymentTerms: v.paymentTerms || null,
        creditLimit: v.creditLimit === '' ? null : Number(v.creditLimit),
        salesRepId: v.salesRepId || null,
      }, token);
      toast.success('Perfil comercial salvo');
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-bold text-foreground border-b border-gray-100 pb-2">Perfil comercial</h2>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estágio">
          <select {...register('stage')} disabled={!canEdit} className={inputCls}>
            {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Responsável">
          <select {...register('salesRepId')} disabled={!canEdit} className={inputCls}>
            <option value="">—</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Condição de pagamento">
          <input {...register('paymentTerms')} disabled={!canEdit} placeholder="Ex: 30 dias" className={inputCls} />
        </Field>
        <Field label="Limite de crédito (R$)">
          <input {...register('creditLimit')} disabled={!canEdit} type="number" min={0} step="0.01" className={inputCls} />
        </Field>
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
          >
            <Save size={15} /> {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      )}
    </form>
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
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-foreground border-b border-gray-100 pb-2 mb-3">Produtos e serviços</h2>
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
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:border-ring focus:outline-none"
            >
              <option value="">+ produto/serviço…</option>
              {available.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {adding && (
              <button
                onClick={() => { add(adding); setAdding(''); }}
                className="rounded-lg p-1 text-white"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
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

const ADDRESS_TYPE_LABELS: Record<string, string> = {
  PRIMARY: 'Principal', BILLING: 'Cobrança', SHIPPING: 'Entrega', COLLECTION: 'Coleta',
};

function AddressesSection({
  organizationId, addresses, canEdit,
}: { organizationId: string; addresses: OrgAddressDto[]; canEdit: boolean }) {
  const { token } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { type: 'PRIMARY', zipCode: '', street: '', number: '', district: '', city: '', state: '' },
  });

  async function onAdd(v: Record<string, string>) {
    try {
      await organizationsApi.addAddress(organizationId, v, token);
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function remove(addressId: string) {
    try {
      await organizationsApi.removeAddress(organizationId, addressId, token);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
        <h2 className="text-sm font-bold text-foreground">Endereços</h2>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus size={13} /> Adicionar
          </button>
        )}
      </div>

      {addresses.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground">Nenhum endereço cadastrado.</p>
      )}

      <ul className="space-y-2">
        {addresses.map((a) => (
          <li key={a.id} className="flex items-start justify-between rounded-lg border border-gray-100 px-3 py-2">
            <div className="text-sm text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">{ADDRESS_TYPE_LABELS[a.type] ?? a.type}</span>
              <p>{[a.street, a.number, a.district, a.city, a.state].filter(Boolean).join(', ') || '—'}</p>
            </div>
            {canEdit && (
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-red-600" aria-label="Remover endereço">
                <X size={15} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {showForm && (
        <form onSubmit={handleSubmit(onAdd)} className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select {...register('type')} className={inputCls}>
              {Object.entries(ADDRESS_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input {...register('zipCode')} placeholder="CEP" className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input {...register('street')} placeholder="Rua" className={`${inputCls} col-span-2`} />
            <input {...register('number')} placeholder="Nº" className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input {...register('district')} placeholder="Bairro" className={inputCls} />
            <input {...register('city')} placeholder="Cidade" className={inputCls} />
            <input {...register('state')} placeholder="UF" maxLength={2} className={inputCls} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { reset(); setShowForm(false); }} className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Cancelar</button>
            <button type="submit" className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: 'hsl(var(--primary))' }}>Adicionar</button>
          </div>
        </form>
      )}
    </section>
  );
}
