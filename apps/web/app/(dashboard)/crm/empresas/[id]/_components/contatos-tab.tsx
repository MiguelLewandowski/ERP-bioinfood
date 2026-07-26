'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Mail, Phone, X, Pencil } from 'lucide-react';
import type { ContactListItemDto, TaxonomyDto } from '@bioinfood/shared';
import { contactsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { MaskedInput } from '@/components/ui/masked-input';
import { maskPhone } from '@/lib/masks';

const inputCls =
  'w-full text-sm px-3 py-2.5 border border-border rounded-lg focus:border-ring focus:outline-none';

interface ContatosTabProps {
  organizationId: string;
  initialContacts: ContactListItemDto[];
  sources: TaxonomyDto[];
  canEdit: boolean;
}

// Mesmos campos do diálogo de criar pessoa — editar e criar coletam o mesmo
// conjunto. As demais colunas seguem no banco, fora das telas.
interface ContactForm {
  name: string;
  email: string;
  whatsapp: string;
  linkedin: string;
  sourceId: string;
  jobTitle: string;
}

const EMPTY_FORM: ContactForm = {
  name: '', email: '', whatsapp: '', linkedin: '', sourceId: '', jobTitle: '',
};

export function ContatosTab({ organizationId, initialContacts, sources, canEdit }: ContatosTabProps) {
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
        email: detail.email ?? '',
        whatsapp: detail.whatsapp ?? '',
        linkedin: detail.linkedin ?? '',
        sourceId: detail.source?.id ?? '',
        jobTitle: contact.link.jobTitle ?? '',
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
      email: v.email || undefined,
      whatsapp: v.whatsapp || undefined,
      linkedin: v.linkedin || undefined,
      sourceId: v.sourceId || undefined,
    };
    const linkPayload = { jobTitle: v.jobTitle || undefined };
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
          <Button onClick={openCreate}>
            <Plus size={15} /> Novo contato
          </Button>
        )}
      </div>

      {initialContacts.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum contato vinculado a este cliente.</p>
        </div>
      )}

      <ul className="space-y-2">
        {initialContacts.map((c) => (
          <li key={c.id} className="flex items-start justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{c.name}</span>
                {c.link?.jobTitle && <span className="text-xs text-muted-foreground">· {c.link.jobTitle}</span>}
                {c.source && <span className="text-xs text-muted-foreground">· {c.source.name}</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {c.email && <span className="inline-flex items-center gap-1"><Mail size={12} />{c.email}</span>}
                {c.whatsapp && <span className="inline-flex items-center gap-1"><Phone size={12} />{c.whatsapp}</span>}
              </div>
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-xl border border-border bg-muted p-4">
          <h3 className="text-xs font-bold text-foreground">{mode.kind === 'edit' ? 'Editar contato' : 'Novo contato'}</h3>

          <div className="grid grid-cols-2 gap-2">
            <input {...register('name', { required: true })} placeholder="Nome *" className={inputCls} />
            <input {...register('jobTitle')} placeholder="Cargo" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input {...register('email')} type="email" placeholder="E-mail" className={inputCls} />
            <MaskedInput format={maskPhone} {...register('whatsapp')} placeholder="WhatsApp" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input {...register('linkedin')} placeholder="LinkedIn" className={inputCls} />
            <select aria-label="Origem" {...register('sourceId')} className={inputCls}>
              <option value="">Origem…</option>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={closeForm}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Salvando…' : mode.kind === 'edit' ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
