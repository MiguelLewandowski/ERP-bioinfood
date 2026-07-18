'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Mail, Phone, X, Star, Pencil } from 'lucide-react';
import type { ContactListItemDto } from '@bioinfood/shared';
import { contactsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';

const inputCls =
  'w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-ring focus:outline-none';

interface ContatosTabProps {
  organizationId: string;
  initialContacts: ContactListItemDto[];
  canEdit: boolean;
}

interface ContactForm {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  mobile: string;
  whatsapp: string;
  fax: string;
  ramal: string;
  birthDate: string;
  linkedin: string;
  facebook: string;
  twitter: string;
  skype: string;
  instagram: string;
  jobTitle: string;
  isDecision: boolean;
  isFinance: boolean;
  isTechnical: boolean;
  isPrimary: boolean;
}

const EMPTY_FORM: ContactForm = {
  name: '', cpf: '', email: '', phone: '', mobile: '', whatsapp: '', fax: '', ramal: '',
  birthDate: '', linkedin: '', facebook: '', twitter: '', skype: '', instagram: '',
  jobTitle: '', isDecision: false, isFinance: false, isTechnical: false, isPrimary: false,
};

type LinkMarker = 'isDecision' | 'isFinance' | 'isTechnical';

const MARKERS: Array<{ key: LinkMarker; label: string }> = [
  { key: 'isDecision', label: 'Decisor' },
  { key: 'isFinance', label: 'Financeiro' },
  { key: 'isTechnical', label: 'Técnico' },
];

export function ContatosTab({ organizationId, initialContacts, canEdit }: ContatosTabProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<{ kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; contactId: string; linkId: string }>({ kind: 'closed' });
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<ContactForm>({ defaultValues: EMPTY_FORM });

  function openCreate() {
    reset(EMPTY_FORM);
    setMode({ kind: 'create' });
  }

  async function openEdit(contact: ContactListItemDto) {
    if (!contact.link) return;
    setLoadingEdit(contact.id);
    try {
      const detail = await contactsApi.get(contact.id, token);
      reset({
        name: detail.name,
        cpf: detail.cpf ?? '',
        email: detail.email ?? '',
        phone: detail.phone ?? '',
        mobile: detail.mobile ?? '',
        whatsapp: detail.whatsapp ?? '',
        fax: detail.fax ?? '',
        ramal: detail.ramal ?? '',
        birthDate: detail.birthDate?.slice(0, 10) ?? '',
        linkedin: detail.linkedin ?? '',
        facebook: detail.facebook ?? '',
        twitter: detail.twitter ?? '',
        skype: detail.skype ?? '',
        instagram: detail.instagram ?? '',
        jobTitle: contact.link.jobTitle ?? '',
        isDecision: contact.link.isDecision,
        isFinance: contact.link.isFinance,
        isTechnical: contact.link.isTechnical,
        isPrimary: contact.link.isPrimary,
      });
      setMode({ kind: 'edit', contactId: contact.id, linkId: contact.link.linkId });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingEdit(null);
    }
  }

  function closeForm() {
    reset(EMPTY_FORM);
    setMode({ kind: 'closed' });
  }

  async function onSubmit(v: ContactForm) {
    setSaving(true);
    const contactPayload = {
      name: v.name,
      cpf: v.cpf || undefined,
      email: v.email || undefined,
      phone: v.phone || undefined,
      mobile: v.mobile || undefined,
      whatsapp: v.whatsapp || undefined,
      fax: v.fax || undefined,
      ramal: v.ramal || undefined,
      birthDate: v.birthDate || undefined,
      linkedin: v.linkedin || undefined,
      facebook: v.facebook || undefined,
      twitter: v.twitter || undefined,
      skype: v.skype || undefined,
      instagram: v.instagram || undefined,
    };
    const linkPayload = {
      jobTitle: v.jobTitle || undefined,
      isDecision: v.isDecision,
      isFinance: v.isFinance,
      isTechnical: v.isTechnical,
      isPrimary: v.isPrimary,
    };
    try {
      if (mode.kind === 'create') {
        const contact = await contactsApi.create(contactPayload, token);
        await contactsApi.addLink(contact.id, { orgId: organizationId, ...linkPayload }, token);
        toast.success('Contato adicionado');
      } else if (mode.kind === 'edit') {
        await Promise.all([
          contactsApi.update(mode.contactId, contactPayload, token),
          contactsApi.updateLink(mode.contactId, mode.linkId, linkPayload, token),
        ]);
        toast.success('Contato atualizado');
      }
      closeForm();
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function unlink(contact: ContactListItemDto) {
    if (!contact.link) return;
    try {
      await contactsApi.removeLink(contact.id, contact.link.linkId, token);
      toast.success('Vínculo removido');
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const showForm = mode.kind !== 'closed';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {canEdit && !showForm && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
          >
            <Plus size={15} /> Novo contato
          </button>
        )}
      </div>

      {initialContacts.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum contato vinculado a este cliente.</p>
        </div>
      )}

      <ul className="space-y-2">
        {initialContacts.map((c) => (
          <li key={c.id} className="flex items-start justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{c.name}</span>
                {c.link?.isPrimary && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent">
                    <Star size={11} fill="#DD8005" /> Principal
                  </span>
                )}
                {c.link?.jobTitle && <span className="text-xs text-muted-foreground">· {c.link.jobTitle}</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {c.email && <span className="inline-flex items-center gap-1"><Mail size={12} />{c.email}</span>}
                {c.phone && <span className="inline-flex items-center gap-1"><Phone size={12} />{c.phone}</span>}
              </div>
              {c.link && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {MARKERS.filter((m) => c.link![m.key]).map((m) => (
                    <span key={m.key} className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-medium text-primary-dark">
                      {m.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(c)}
                  disabled={loadingEdit === c.id}
                  className="text-muted-foreground hover:text-primary disabled:opacity-50"
                  aria-label="Editar contato"
                >
                  <Pencil size={15} />
                </button>
                <button onClick={() => unlink(c)} className="text-muted-foreground hover:text-red-600" aria-label="Remover vínculo">
                  <X size={16} />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-xs font-bold text-foreground">{mode.kind === 'edit' ? 'Editar contato' : 'Novo contato'}</h3>

          <div className="grid grid-cols-2 gap-2">
            <input {...register('name', { required: true })} placeholder="Nome *" className={inputCls} />
            <input {...register('jobTitle')} placeholder="Cargo" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input {...register('email')} type="email" placeholder="E-mail" className={inputCls} />
            <input {...register('cpf')} placeholder="CPF" className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input {...register('phone')} placeholder="Telefone" className={inputCls} />
            <input {...register('mobile')} placeholder="Celular" className={inputCls} />
            <input {...register('whatsapp')} placeholder="WhatsApp" className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input {...register('fax')} placeholder="Fax" className={inputCls} />
            <input {...register('ramal')} placeholder="Ramal" className={inputCls} />
            <input {...register('birthDate')} type="date" placeholder="Aniversário" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input {...register('linkedin')} placeholder="LinkedIn" className={inputCls} />
            <input {...register('instagram')} placeholder="Instagram" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input {...register('facebook')} placeholder="Facebook" className={inputCls} />
            <input {...register('twitter')} placeholder="Twitter" className={inputCls} />
          </div>
          <input {...register('skype')} placeholder="Skype" className={inputCls} />

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <label className="flex items-center gap-1.5"><input type="checkbox" {...register('isPrimary')} className="accent-[hsl(var(--primary))]" /> Principal</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" {...register('isDecision')} className="accent-[hsl(var(--primary))]" /> Decisor</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" {...register('isFinance')} className="accent-[hsl(var(--primary))]" /> Financeiro</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" {...register('isTechnical')} className="accent-[hsl(var(--primary))]" /> Técnico</label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'hsl(var(--primary))' }}>
              {saving ? 'Salvando…' : mode.kind === 'edit' ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
