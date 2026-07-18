'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Trash2, Plus, X } from 'lucide-react';
import type { ContactDetailDto, ContactListItemDto, TaxonomyDto } from '@bioinfood/shared';
import { contactsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { OrganizationSelect } from '@/components/shared/organization-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface PessoaDialogProps {
  mode: 'create' | 'edit';
  contactId?: string;
  sources: TaxonomyDto[];
  onSaved: (c: ContactListItemDto) => void;
  onDeleted?: (id: string) => void;
  onClose: () => void;
}

interface FormValues {
  name: string;
  email: string;
  phone: string;
  mobile: string;
  whatsapp: string;
  sourceId: string;
}

export function PessoaDialog({
  mode, contactId, sources, onSaved, onDeleted, onClose,
}: PessoaDialogProps) {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [detail, setDetail] = useState<ContactDetailDto | null>(null);
  const [newOrgId, setNewOrgId] = useState<string | undefined>();
  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', email: '', phone: '', mobile: '', whatsapp: '', sourceId: '' },
  });

  useEffect(() => {
    if (mode !== 'edit' || !contactId) return;
    contactsApi.get(contactId, token)
      .then((c) => {
        setDetail(c);
        reset({
          name: c.name, email: c.email ?? '', phone: c.phone ?? '', mobile: c.mobile ?? '',
          whatsapp: c.whatsapp ?? '', sourceId: c.source?.id ?? '',
        });
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [mode, contactId, token, reset]);

  async function onSubmit(v: FormValues) {
    setSaving(true);
    try {
      const payload = {
        name: v.name,
        email: v.email || undefined,
        phone: v.phone || undefined,
        mobile: v.mobile || undefined,
        whatsapp: v.whatsapp || undefined,
        sourceId: v.sourceId || undefined,
      };
      const saved = mode === 'create'
        ? await contactsApi.create(payload, token)
        : await contactsApi.update(contactId!, payload, token);
      onSaved(saved);
      if (mode === 'create') onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!contactId) return;
    setSaving(true);
    try {
      await contactsApi.remove(contactId, token);
      onDeleted?.(contactId);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function addLink() {
    if (!contactId || !newOrgId) return;
    try {
      const link = await contactsApi.addLink(contactId, { orgId: newOrgId }, token);
      setDetail((prev) => (prev ? { ...prev, orgLinks: [...prev.orgLinks, link] } : prev));
      setNewOrgId(undefined);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function removeLink(linkId: string) {
    if (!contactId) return;
    try {
      await contactsApi.removeLink(contactId, linkId, token);
      setDetail((prev) => (prev ? { ...prev, orgLinks: prev.orgLinks.filter((l) => l.id !== linkId) } : prev));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova Pessoa' : 'Editar Pessoa'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="pessoa-name">Nome *</Label>
                <Input id="pessoa-name" {...register('name', { required: true })} placeholder="Nome completo" />
                {errors.name && <p className="mt-1 text-xs text-destructive">Nome é obrigatório</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pessoa-email">E-mail</Label>
                  <Input id="pessoa-email" {...register('email')} type="email" />
                </div>
                <div>
                  <Label htmlFor="pessoa-source">Origem</Label>
                  <Select id="pessoa-source" {...register('sourceId')}>
                    <option value="">—</option>
                    {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="pessoa-phone">Telefone</Label>
                  <Input id="pessoa-phone" {...register('phone')} />
                </div>
                <div>
                  <Label htmlFor="pessoa-mobile">Celular</Label>
                  <Input id="pessoa-mobile" {...register('mobile')} />
                </div>
                <div>
                  <Label htmlFor="pessoa-whatsapp">WhatsApp</Label>
                  <Input id="pessoa-whatsapp" {...register('whatsapp')} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {mode === 'edit' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={saving}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={15} /> Excluir
                  </Button>
                ) : <span />}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </form>

            {mode === 'edit' && detail && (
              <div className="mt-2 border-t border-border pt-4">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Empresas vinculadas</h3>
                {detail.orgLinks.length === 0 && (
                  <p className="mb-2 text-xs text-muted-foreground">Nenhuma empresa vinculada.</p>
                )}
                <ul className="mb-2 space-y-1.5">
                  {detail.orgLinks.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5">
                      <span className="truncate text-sm text-foreground">
                        {l.organization.tradeName ?? l.organization.legalName}
                        {l.jobTitle && <span className="text-xs text-muted-foreground"> · {l.jobTitle}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLink(l.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Remover vínculo"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-1.5">
                  <OrganizationSelect token={token} value={newOrgId} onChange={setNewOrgId} />
                  <Button type="button" size="icon" onClick={addLink} disabled={!newOrgId} aria-label="Vincular empresa">
                    <Plus size={15} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
