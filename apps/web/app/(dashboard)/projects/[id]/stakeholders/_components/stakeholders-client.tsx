'use client'; // matriz interativa + CRUD

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Users, Trash2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { StakeholderDto, StakeholderType, PowerInterestQuadrant } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { stakeholdersApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { StakeholderMatrix } from './stakeholder-matrix';
import { ContactSelect } from './contact-select';

const LEVELS = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const;
const LEVEL_LABELS: Record<string, string> = {
  VERY_LOW: 'Muito Baixo', LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto', VERY_HIGH: 'Muito Alto',
};

const TYPE_OPTIONS: StakeholderType[] = ['SPONSOR', 'OWNER', 'TEAM_MEMBER', 'STAKEHOLDER'];
const TYPE_LABELS: Record<StakeholderType, string> = {
  SPONSOR: 'Patrocinador',
  OWNER: 'Dono do projeto',
  TEAM_MEMBER: 'Membro da equipe',
  STAKEHOLDER: 'Interessado',
};

const QUADRANT_LABELS: Record<PowerInterestQuadrant, string> = {
  MANAGE_CLOSELY: 'Gerenciar de Perto',
  KEEP_SATISFIED: 'Manter Satisfeito',
  KEEP_INFORMED: 'Manter Informado',
  MONITOR: 'Monitorar',
};

const QUADRANT_ORDER: PowerInterestQuadrant[] = [
  'MANAGE_CLOSELY', 'KEEP_SATISFIED', 'KEEP_INFORMED', 'MONITOR',
];

const RBAC_CAN_WRITE = ['INSERE', 'APROVA', 'ADMIN'];
const RBAC_CAN_DELETE = ['APROVA', 'ADMIN'];

const schema = z.object({
  contactId: z.string().min(1, 'Selecione um contato'),
  type: z.enum(['SPONSOR', 'OWNER', 'TEAM_MEMBER', 'STAKEHOLDER']),
  roleNote: z.string().max(200).optional(),
  influence: z.enum(LEVELS).optional().or(z.literal('')),
  interest: z.enum(LEVELS).optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

interface StakeholdersClientProps {
  projectId: string;
  initialStakeholders: StakeholderDto[];
}

export function StakeholdersClient({ projectId, initialStakeholders }: StakeholdersClientProps) {
  const { token, session } = useAuth();
  const confirm = useConfirm();
  const canWrite = RBAC_CAN_WRITE.includes(session.role);
  const canDelete = RBAC_CAN_DELETE.includes(session.role);

  const [stakeholders, setStakeholders] = useState<StakeholderDto[]>(initialStakeholders);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StakeholderDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contactId: '', type: 'STAKEHOLDER', roleNote: '', influence: '', interest: '' },
  });

  function openCreate() {
    reset({ contactId: '', type: 'STAKEHOLDER', roleNote: '', influence: '', interest: '' });
    setEditing(null);
    setOpen(true);
  }

  function openEdit(s: StakeholderDto) {
    reset({
      contactId: s.contactId,
      type: s.type,
      roleNote: s.roleNote ?? '',
      influence: s.influence ?? '',
      interest: s.interest ?? '',
    });
    setEditing(s);
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    setSaving(true);
    const payload = {
      contactId: values.contactId,
      type: values.type,
      roleNote: values.roleNote || undefined,
      influence: values.influence || undefined,
      interest: values.interest || undefined,
    };
    try {
      if (editing) {
        const updated = await stakeholdersApi.update(projectId, editing.id, payload, token);
        setStakeholders((prev) => prev.map((s) => (s.id === editing.id ? updated : s)));
      } else {
        const created = await stakeholdersApi.create(projectId, payload, token);
        setStakeholders((prev) => [...prev, created]);
      }
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: StakeholderDto) {
    const ok = await confirm({
      title: 'Remover parte interessada?',
      description: `"${s.contact.name}" deixa de ser registrada como parte interessada deste projeto.`,
      confirmLabel: 'Remover',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeleting(s.id);
    try {
      await stakeholdersApi.remove(projectId, s.id, token);
      setStakeholders((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(null);
    }
  }

  const grouped = QUADRANT_ORDER.map((q) => ({
    quadrant: q,
    items: stakeholders.filter((s) => s.quadrant === q),
  }));
  const unplaced = stakeholders.filter((s) => !s.quadrant);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Partes Interessadas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stakeholders.length} registrada{stakeholders.length === 1 ? '' : 's'}
            {unplaced.length > 0 && <span className="ml-2 text-muted-foreground">· {unplaced.length} sem poder/interesse definidos</span>}
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
          >
            <Plus size={16} /> Nova Parte Interessada
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Grade Poder × Interesse</h3>
          <StakeholderMatrix stakeholders={stakeholders} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Por Quadrante de Engajamento</h3>
          {stakeholders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <Users size={28} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma parte interessada cadastrada ainda.</p>
            </div>
          )}
          <div className="space-y-4">
            {grouped.filter((g) => g.items.length > 0).map(({ quadrant, items }) => (
              <div key={quadrant}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  {QUADRANT_LABELS[quadrant]} ({items.length})
                </p>
                <div className="space-y-1.5">
                  {items.map((s) => (
                    <StakeholderRow
                      key={s.id}
                      stakeholder={s}
                      canWrite={canWrite}
                      canDelete={canDelete}
                      deleting={deleting === s.id}
                      onEdit={() => openEdit(s)}
                      onDelete={() => handleDelete(s)}
                    />
                  ))}
                </div>
              </div>
            ))}
            {unplaced.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Sem poder/interesse definidos ({unplaced.length})
                </p>
                <div className="space-y-1.5">
                  {unplaced.map((s) => (
                    <StakeholderRow
                      key={s.id}
                      stakeholder={s}
                      canWrite={canWrite}
                      canDelete={canDelete}
                      deleting={deleting === s.id}
                      onEdit={() => openEdit(s)}
                      onDelete={() => handleDelete(s)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <Dialog open onOpenChange={(v) => !v && setOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Users size={16} className="text-primary" />
                {editing ? 'Editar Parte Interessada' : 'Nova Parte Interessada'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Contato *</label>
                <Controller
                  name="contactId"
                  control={control}
                  render={({ field }) => (
                    <ContactSelect
                      token={token}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!!editing}
                    />
                  )}
                />
                {errors.contactId && <p className="text-xs text-red-500 mt-1">{errors.contactId.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Papel</label>
                <select {...register('type')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white">
                  {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Papel específico (opcional)</label>
                <input {...register('roleNote')} placeholder="Ex: Diretora de P&D, ponto focal técnico…" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ring focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Poder (influência)</label>
                  <select {...register('influence')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white">
                    <option value="">—</option>
                    {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Interesse</label>
                  <select {...register('interest')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white">
                    <option value="">—</option>
                    {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StakeholderRow({
  stakeholder, canWrite, canDelete, deleting, onEdit, onDelete,
}: {
  stakeholder: StakeholderDto;
  canWrite: boolean;
  canDelete: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{stakeholder.contact.name}</p>
        <p className="text-xs text-muted-foreground">
          {TYPE_LABELS[stakeholder.type]}
          {stakeholder.roleNote && ` · ${stakeholder.roleNote}`}
        </p>
      </div>
      {canWrite && (
        <button onClick={onEdit} aria-label={`Editar ${stakeholder.contact.name}`} className="text-gray-400 hover:text-primary transition-colors shrink-0">
          <Pencil size={14} />
        </button>
      )}
      {canDelete && (
        <button onClick={onDelete} disabled={deleting} aria-label={`Remover ${stakeholder.contact.name}`} className="text-gray-400 hover:text-red-500 transition-colors shrink-0 disabled:opacity-50">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
