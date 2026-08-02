'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Plus, Mail, Phone, Users as UsersIcon, MapPin, MessageCircle, MoreHorizontal, ListChecks,
  ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import type {
  CrmActivityDto, ContactListItemDto, InteractionDto, InteractionType, InteractionDirection,
} from '@bioinfood/shared';
import { interactionsApi, crmActivitiesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { ACTIVITY_TYPE_LABELS } from '@/lib/crm-tasks';
import { Button } from '@/components/ui/button';

const inputCls =
  'w-full text-sm px-3 py-2.5 border border-border rounded-lg focus:border-ring focus:outline-none';

const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  EMAIL: 'E-mail', CALL: 'Ligação', MEETING: 'Reunião', VISIT: 'Visita', WHATSAPP: 'WhatsApp', OTHER: 'Outro',
};

const INTERACTION_TYPE_ICONS: Record<InteractionType, React.ElementType> = {
  EMAIL: Mail, CALL: Phone, MEETING: UsersIcon, VISIT: MapPin, WHATSAPP: MessageCircle, OTHER: MoreHorizontal,
};

export interface TimelineEntry {
  date: string;
  node: React.ReactNode;
}

function InteractionRow({ interaction }: { interaction: InteractionDto }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = INTERACTION_TYPE_ICONS[interaction.type];
  const DirIcon = interaction.direction === 'INBOUND' ? ArrowDownLeft : ArrowUpRight;
  const date = new Date(interaction.interactionAt);

  return (
    <li className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/20 text-primary-dark">
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-foreground">{INTERACTION_TYPE_LABELS[interaction.type]}</span>
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
                type="button"
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

export function interactionEntry(i: InteractionDto): TimelineEntry {
  return { date: i.interactionAt, node: <InteractionRow key={`i-${i.id}`} interaction={i} /> };
}

export function taskEntry(t: CrmActivityDto): TimelineEntry {
  const date = t.completedAt ?? t.dueDate ?? t.createdAt;
  return {
    date,
    node: (
      <li key={`t-${t.id}`} className="rounded-lg border border-border/60 bg-card px-3 py-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
            <ListChecks size={12} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
              <span className="font-medium text-foreground">Tarefa · {ACTIVITY_TYPE_LABELS[t.type]}</span>
              {t.status === 'DONE' && <span className="text-success">concluída</span>}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {new Date(date).toLocaleString('pt-BR')}
              {t.responsible && ` · ${t.responsible.name}`}
            </div>
            {t.description && <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>}
          </div>
        </div>
      </li>
    ),
  };
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

interface OpportunityTimelineProps {
  opportunityId: string;
  contacts: ContactListItemDto[];
  canEdit: boolean;
  /** Classe do container rolável da lista — modal usa altura fixa, página cheia pode deixar livre. */
  listClassName?: string;
}

/**
 * Timeline do negócio: interações + tarefas mescladas em ordem cronológica,
 * com formulário de registrar nova interação. Reaproveitada tanto no modal
 * quanto na página de detalhe da oportunidade.
 */
export function OpportunityTimeline({
  opportunityId, contacts, canEdit, listClassName = 'max-h-[28rem] overflow-y-auto',
}: OpportunityTimelineProps) {
  const { token, session } = useAuth();
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, watch, reset } = useForm<NewInteractionForm>({
    defaultValues: {
      type: 'MEETING', direction: 'OUTBOUND', contactId: '', subject: '', summary: '', fullContent: '',
      createFollowUp: false, followUpTitle: '', followUpDueDate: '',
    },
  });
  const createFollowUp = watch('createFollowUp');

  const load = useCallback(() => {
    let cancelled = false;
    Promise.all([
      interactionsApi.list(opportunityId, token),
      crmActivitiesApi.list(token, { opportunityId }),
    ])
      .then(([interactions, tasks]) => {
        if (cancelled) return;
        const merged = [
          ...interactions.map(interactionEntry),
          ...tasks.map(taskEntry),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(merged);
      })
      .catch((err) => { if (!cancelled) toast.error(getErrorMessage(err)); });
    return () => { cancelled = true; };
  }, [opportunityId, token]);

  useEffect(() => load(), [load]);

  async function onSubmit(v: NewInteractionForm) {
    setSaving(true);
    try {
      const interaction = await interactionsApi.create({
        opportunityId,
        contactId: v.contactId || undefined,
        type: v.type,
        direction: v.direction,
        subject: v.subject || undefined,
        summary: v.summary || undefined,
        fullContent: v.fullContent || undefined,
      }, token);

      if (v.createFollowUp && v.followUpTitle) {
        await crmActivitiesApi.create({
          opportunityId,
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
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
        {canEdit && !showForm && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Registrar interação
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="mb-3 space-y-3 rounded-xl border border-border bg-muted p-4">
          <div className="grid grid-cols-3 gap-2">
            <select aria-label="Tipo de interação" {...register('type')} className={inputCls}>
              {Object.entries(INTERACTION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select aria-label="Direção" {...register('direction')} className={inputCls}>
              <option value="OUTBOUND">Saída</option>
              <option value="INBOUND">Entrada</option>
              <option value="INTERNAL">Interna</option>
            </select>
            <select aria-label="Contato" {...register('contactId')} className={inputCls}>
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
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-3">
              <input {...register('followUpTitle')} placeholder="Ex: Enviar proposta" className={inputCls} />
              <input aria-label="Prazo do follow-up" {...register('followUpDueDate')} type="date" className={inputCls} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { reset(); setShowForm(false); }}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Salvando…' : 'Registrar'}
            </Button>
          </div>
        </form>
      )}

      {entries === null && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border border-border/60 bg-muted/40" />
          ))}
        </div>
      )}
      {entries !== null && entries.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Nenhuma interação ou tarefa registrada ainda.
        </p>
      )}
      {entries !== null && entries.length > 0 && (
        <ul className={`space-y-2 ${listClassName}`}>
          {entries.map((e) => e.node)}
        </ul>
      )}
    </div>
  );
}
