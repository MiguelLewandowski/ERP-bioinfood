'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Plus, Mail, Phone, Users as UsersIcon, MapPin, MessageCircle, MoreHorizontal,
  ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import type {
  InteractionDto, InteractionType, InteractionDirection, ContactListItemDto,
} from '@bioinfood/shared';
import { interactionsApi, crmActivitiesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';

const inputCls =
  'w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-ring focus:outline-none';

const TYPE_LABELS: Record<InteractionType, string> = {
  EMAIL: 'E-mail', CALL: 'Ligação', MEETING: 'Reunião', VISIT: 'Visita', WHATSAPP: 'WhatsApp', OTHER: 'Outro',
};

const TYPE_ICONS: Record<InteractionType, React.ElementType> = {
  EMAIL: Mail, CALL: Phone, MEETING: UsersIcon, VISIT: MapPin, WHATSAPP: MessageCircle, OTHER: MoreHorizontal,
};

interface TimelineTabProps {
  organizationId: string;
  initialInteractions: InteractionDto[];
  contacts: ContactListItemDto[];
  canEdit: boolean;
}

interface NewInteractionForm {
  type: InteractionType;
  direction: InteractionDirection;
  contactId: string;
  subject: string;
  summary: string;
  fullContent: string;
  createFollowUp: boolean;
  followUpTitle: string;
  followUpDueDate: string;
}

export function TimelineTab({ organizationId, initialInteractions, contacts, canEdit }: TimelineTabProps) {
  const { token, session } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, watch, reset } = useForm<NewInteractionForm>({
    defaultValues: {
      type: 'MEETING', direction: 'OUTBOUND', contactId: '', subject: '', summary: '', fullContent: '',
      createFollowUp: false, followUpTitle: '', followUpDueDate: '',
    },
  });
  const createFollowUp = watch('createFollowUp');

  async function onSubmit(v: NewInteractionForm) {
    setSaving(true);
    try {
      const interaction = await interactionsApi.create({
        orgId: organizationId,
        contactId: v.contactId || undefined,
        type: v.type,
        direction: v.direction,
        subject: v.subject || undefined,
        summary: v.summary || undefined,
        fullContent: v.fullContent || undefined,
      }, token);

      if (v.createFollowUp && v.followUpTitle) {
        await crmActivitiesApi.create({
          orgId: organizationId,
          contactId: v.contactId || undefined,
          interactionId: interaction.id,
          responsibleId: session.sub,
          title: v.followUpTitle,
          dueDate: v.followUpDueDate || undefined,
        }, token);
      }

      toast.success('Interação registrada');
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
          >
            <Plus size={15} /> Registrar interação
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-3 gap-2">
            <select {...register('type')} className={inputCls}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select {...register('direction')} className={inputCls}>
              <option value="OUTBOUND">Saída</option>
              <option value="INBOUND">Entrada</option>
              <option value="INTERNAL">Interna</option>
            </select>
            <select {...register('contactId')} className={inputCls}>
              <option value="">Sem contato específico</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <input {...register('subject')} placeholder="Assunto" className={inputCls} />
          <textarea {...register('summary')} placeholder="Resumo (3 linhas)" rows={2} className={inputCls} />
          <textarea {...register('fullContent')} placeholder="Conteúdo completo (opcional)" rows={3} className={inputCls} />

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" {...register('createFollowUp')} className="accent-[hsl(var(--primary))]" />
            Criar follow-up junto
          </label>

          {createFollowUp && (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-white p-3">
              <input {...register('followUpTitle')} placeholder="Ex: Enviar proposta" className={inputCls} />
              <input {...register('followUpDueDate')} type="date" className={inputCls} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { reset(); setShowForm(false); }} className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'hsl(var(--primary))' }}>
              {saving ? 'Salvando…' : 'Registrar'}
            </button>
          </div>
        </form>
      )}

      {initialInteractions.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
        </div>
      )}

      <ol className="space-y-2">
        {initialInteractions.map((i) => <TimelineItem key={i.id} interaction={i} />)}
      </ol>
    </div>
  );
}

function TimelineItem({ interaction }: { interaction: InteractionDto }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICONS[interaction.type];
  const DirIcon = interaction.direction === 'INBOUND' ? ArrowDownLeft : ArrowUpRight;
  const date = new Date(interaction.interactionAt);

  return (
    <li className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/20 text-primary-dark">
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-foreground">{TYPE_LABELS[interaction.type]}</span>
            {interaction.direction !== 'INTERNAL' && <DirIcon size={12} className="text-muted-foreground" />}
            {interaction.subject && <span className="text-sm text-muted-foreground">— {interaction.subject}</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{date.toLocaleString('pt-BR')}</span>
            {interaction.contact && <span>· {interaction.contact.name}</span>}
            {interaction.user && <span>· por {interaction.user.name}</span>}
          </div>
          {interaction.summary && (
            <p className="mt-1.5 text-sm text-muted-foreground">{interaction.summary}</p>
          )}
          {interaction.fullContent && (
            <>
              {expanded && (
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">{interaction.fullContent}</p>
              )}
              <button
                onClick={() => setExpanded((e) => !e)}
                className="mt-1 flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
              >
                {expanded ? <>Recolher <ChevronUp size={12} /></> : <>Ver conteúdo completo <ChevronDown size={12} /></>}
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
