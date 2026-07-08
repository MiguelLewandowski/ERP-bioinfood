'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, Plus, X } from 'lucide-react';
import type {
  OrganizationDetailDto, TaxonomyDto, OrgAddressDto, PartyRoleType,
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
  'w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed';

interface DadosTabProps {
  organizationId: string;
  organization: OrganizationDetailDto;
  sectors: TaxonomyDto[];
  sources: TaxonomyDto[];
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
  const { organizationId, organization, sectors, sources, canEdit, canManageRoles } = props;
  const { token } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { isDirty } } = useForm<FormValues>({
    defaultValues: {
      legalName: organization.legalName,
      tradeName: organization.tradeName ?? '',
      document: organization.document ?? '',
      documentType: organization.documentType ?? 'CNPJ',
      status: organization.status,
      sectorId: organization.sectorId ?? '',
      sourceId: organization.sourceId ?? '',
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
          <h2 className="text-sm font-bold text-[#1D1D1B] border-b border-gray-100 pb-2">Identificação</h2>

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
            <Field label="Documento">
              <input {...register('document')} disabled={!canEdit} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          <Field label="Observações">
            <textarea {...register('notes')} disabled={!canEdit} rows={3} className={inputCls} />
          </Field>

          {organization.registrationStatus !== 'UNKNOWN' && (
            <p className="text-xs text-[#878787]">
              Situação cadastral (Receita): <strong>{organization.registrationStatus}</strong>
            </p>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#1D1D1B] border-b border-gray-100 pb-2">Contato</h2>
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
          <h2 className="text-sm font-bold text-[#1D1D1B] border-b border-gray-100 pb-2">Redes sociais</h2>
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
                style={{ backgroundColor: '#147F23' }}
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
      <label className="block text-xs font-semibold text-[#575756] mb-1">{label}</label>
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
      <h2 className="text-sm font-bold text-[#1D1D1B] border-b border-gray-100 pb-2 mb-3">Papéis</h2>
      <div className="flex flex-wrap items-center gap-2">
        {roles.length === 0 && <span className="text-xs text-[#878787]">Nenhum papel atribuído.</span>}
        {roles.map((r) => (
          <span
            key={r.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#86C175]/20 px-3 py-1 text-xs font-medium text-[#156D1D]"
          >
            {ROLE_LABELS[r.type]}
            {canManage && (
              <button onClick={() => remove(r.type)} className="text-[#156D1D] hover:text-red-600" aria-label="Remover papel">
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
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:border-[#52B552] focus:outline-none"
            >
              <option value="">+ papel…</option>
              {available.map((t) => <option key={t} value={t}>{ROLE_LABELS[t]}</option>)}
            </select>
            {adding && (
              <button
                onClick={() => { add(adding); setAdding(''); }}
                className="rounded-lg p-1 text-white"
                style={{ backgroundColor: '#147F23' }}
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
  organizationId, profile, canEdit,
}: { organizationId: string; profile: OrganizationDetailDto['customerProfile']; canEdit: boolean }) {
  const { token } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      stage: profile?.stage ?? 'PROSPECT',
      paymentTerms: profile?.paymentTerms ?? '',
      creditLimit: profile?.creditLimit ?? '',
    },
  });

  async function onSubmit(v: { stage: string; paymentTerms: string; creditLimit: string }) {
    setSaving(true);
    try {
      await organizationsApi.saveCustomerProfile(organizationId, {
        stage: v.stage,
        paymentTerms: v.paymentTerms || null,
        creditLimit: v.creditLimit === '' ? null : Number(v.creditLimit),
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
      <h2 className="text-sm font-bold text-[#1D1D1B] border-b border-gray-100 pb-2">Perfil comercial</h2>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Estágio">
          <select {...register('stage')} disabled={!canEdit} className={inputCls}>
            {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
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
            style={{ backgroundColor: '#147F23' }}
          >
            <Save size={15} /> {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      )}
    </form>
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
        <h2 className="text-sm font-bold text-[#1D1D1B]">Endereços</h2>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-medium text-[#147F23] hover:underline"
          >
            <Plus size={13} /> Adicionar
          </button>
        )}
      </div>

      {addresses.length === 0 && !showForm && (
        <p className="text-xs text-[#878787]">Nenhum endereço cadastrado.</p>
      )}

      <ul className="space-y-2">
        {addresses.map((a) => (
          <li key={a.id} className="flex items-start justify-between rounded-lg border border-gray-100 px-3 py-2">
            <div className="text-sm text-[#575756]">
              <span className="text-[11px] font-semibold uppercase text-[#878787]">{ADDRESS_TYPE_LABELS[a.type] ?? a.type}</span>
              <p>{[a.street, a.number, a.district, a.city, a.state].filter(Boolean).join(', ') || '—'}</p>
            </div>
            {canEdit && (
              <button onClick={() => remove(a.id)} className="text-[#878787] hover:text-red-600" aria-label="Remover endereço">
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
            <button type="button" onClick={() => { reset(); setShowForm(false); }} className="px-3 py-1.5 text-xs font-medium text-[#575756]">Cancelar</button>
            <button type="submit" className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: '#147F23' }}>Adicionar</button>
          </div>
        </form>
      )}
    </section>
  );
}
