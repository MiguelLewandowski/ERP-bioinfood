'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Mail, Phone, Users as UsersIcon, MapPin, MessageCircle, MoreHorizontal, ListChecks,
} from 'lucide-react';
import type {
  CrmActivityDto, InteractionDto, InteractionType, OpportunityDto, UserDto,
} from '@bioinfood/shared';
import { interactionsApi, crmActivitiesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { ACTIVITY_TYPE_LABELS } from '@/lib/crm-tasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OpportunityTasksSection } from './opportunity-tasks-section';

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

export function interactionEntry(i: InteractionDto): TimelineEntry {
  const Icon = INTERACTION_TYPE_ICONS[i.type];
  return {
    date: i.interactionAt,
    node: (
      <li key={`i-${i.id}`} className="rounded-lg border border-border/60 bg-card px-3 py-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/20 text-primary-dark">
            <Icon size={12} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
              <span className="font-medium text-foreground">{INTERACTION_TYPE_LABELS[i.type]}</span>
              {i.subject && <span className="text-muted-foreground">— {i.subject}</span>}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {new Date(i.interactionAt).toLocaleString('pt-BR')}
              {i.contact && ` · ${i.contact.name}`}
            </div>
            {i.summary && <p className="mt-1 text-xs text-muted-foreground">{i.summary}</p>}
          </div>
        </div>
      </li>
    ),
  };
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

interface OpportunityTimelineDialogProps {
  opportunity: OpportunityDto;
  orgId: string;
  users: UserDto[];
  canEdit: boolean;
  onClose: () => void;
}

/**
 * Timeline por oportunidade: interações + tarefas mescladas em ordem
 * cronológica à esquerda; criação/gestão de tarefas à direita — tarefa
 * sempre compõe a timeline, não é uma lista separada.
 */
export function OpportunityTimelineDialog({
  opportunity, orgId, users, canEdit, onClose,
}: OpportunityTimelineDialogProps) {
  const { token } = useAuth();
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      interactionsApi.list(orgId, token, opportunity.id),
      crmActivitiesApi.list(token, { opportunityId: opportunity.id }),
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
  }, [opportunity.id, orgId, token]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{opportunity.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Timeline</h3>
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
              <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
                {entries.map((e) => e.node)}
              </ul>
            )}
          </div>

          <div className="min-w-0">
            <OpportunityTasksSection
              opportunityId={opportunity.id}
              orgId={orgId}
              users={users}
              canEdit={canEdit}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
