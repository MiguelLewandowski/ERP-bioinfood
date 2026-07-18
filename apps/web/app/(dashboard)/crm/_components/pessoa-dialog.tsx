'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Trash2, Plus, X } from 'lucide-react';
import type { ContactDetailDto, ContactListItemDto, TaxonomyDto } from '@bioinfood/shared';
import { contactsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { OrganizationSelect } from '@/components/shared/organization-select';
import { MaskedInput } from '@/components/ui/masked-input';
import { maskPhone } from '@/lib/masks';
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
  whatsapp: string;
  email: string;
  sourceId: string;
  jobTitle: string;
  linkedin: string;
  orgId: string;
}

export function PessoaDialog({
  mode, contactId, sources, onSaved, onDeleted, onClose,
}: PessoaDialogProps) {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [detail, setDetail] = useState<ContactDetailDto | null>(null);
  const {
    register, handleSubmit, reset, control, formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '', whatsapp: '', email: '', sourceId: '', jobTitle: '', linkedin: '', orgId: '',
    },
  });

  const primaryLink = detail?.orgLinks[0];

  useEffect(() => {
    if (mode !== 'edit' || !contactId) return;
    contactsApi.get(contactId, token)
      .then((c) => {
        setDetail(c);
        reset({
          name: c.name,
          whatsapp: c.whatsapp ?? '',
          email: c.email ?? '',
          sourceId: c.source?.id ?? '',
          jobTitle: c.orgLinks[0]?.jobTitle ?? '',
          linkedin: c.linkedin ?? '',
          orgId: c.orgLinks[0]?.orgId ?? '',
        });
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [mode, contactId, token, reset]);

  async function onSubmit(v: FormValues) {
    if (mode === 'create' && !v.orgId) {
      toast.error('Selecione a empresa');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: v.name,
        whatsapp: v.whatsapp || undefined,
        email: v.email || undefined,
        sourceId: v.sourceId || undefined,
        linkedin: v.linkedin || undefined,
      };
      if (mode === 'create') {
        const contact = await contactsApi.create(payload, token);
        await contactsApi.addLink(contact.id, { orgId: v.orgId, jobTitle: v.jobTitle || undefined }, token);
        onSaved(contact);
        onClose();
      } else {
        const contact = await contactsApi.update(contactId!, payload, token);
        if (primaryLink && v.jobTitle !== (primaryLink.jobTitle ?? '')) {
          await contactsApi.updateLink(contactId!, primaryLink.id, { jobTitle: v.jobTitle || undefined }, token);
        }
        onSaved(contact);
      }
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

              {mode === 'create' ? (
                <div>
                  <Label>Empresa *</Label>
                  <Controller
                    name="orgId"
                    control={control}
                    render={({ field }) => (
                      <OrganizationSelect token={token} value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
              ) : (
                detail && detail.orgLinks.length > 0 && (
                  <div>
                    <Label>Empresas vinculadas</Label>
                    <ul className="space-y-1.5">
                      {detail.orgLinks.map((l) => (
                        <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5">
                          <span className="truncate text-sm text-foreground">
                            {l.organization.tradeName ?? l.organization.legalName}
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
                  </div>
                )
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pessoa-whatsapp">WhatsApp</Label>
                  <MaskedInput id="pessoa-whatsapp" format={maskPhone} {...register('whatsapp')} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <Label htmlFor="pessoa-email">E-mail</Label>
                  <Input id="pessoa-email" {...register('email')} type="email" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pessoa-job-title">Cargo</Label>
                  <Input id="pessoa-job-title" {...register('jobTitle')} placeholder="Ex: CTO" />
                </div>
                <div>
                  <Label htmlFor="pessoa-source">Origem</Label>
                  <Select id="pessoa-source" {...register('sourceId')}>
                    <option value="">—</option>
                    {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="pessoa-linkedin">LinkedIn</Label>
                <Input id="pessoa-linkedin" {...register('linkedin')} placeholder="linkedin.com/in/…" />
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

            {mode === 'edit' && detail && detail.orgLinks.length === 0 && (
              <div className="mt-2 border-t border-border pt-4">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Vincular a uma empresa</h3>
                <LinkOrgInline contactId={contactId!} onLinked={(link) => setDetail((prev) => (prev ? { ...prev, orgLinks: [link] } : prev))} />
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LinkOrgInline({ contactId, onLinked }: { contactId: string; onLinked: (link: ContactDetailDto['orgLinks'][number]) => void }) {
  const { token } = useAuth();
  const [orgId, setOrgId] = useState<string | undefined>();

  async function addLink() {
    if (!orgId) return;
    try {
      const link = await contactsApi.addLink(contactId, { orgId }, token);
      onLinked(link);
      setOrgId(undefined);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <OrganizationSelect token={token} value={orgId} onChange={setOrgId} />
      <Button type="button" size="icon" onClick={addLink} disabled={!orgId} aria-label="Vincular empresa">
        <Plus size={15} />
      </Button>
    </div>
  );
}
