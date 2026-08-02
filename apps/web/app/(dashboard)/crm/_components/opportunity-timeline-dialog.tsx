'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { ContactListItemDto, OpportunityDto, UserDto } from '@bioinfood/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OpportunityTimeline } from './opportunity-timeline';
import { OpportunityTasksSection } from './opportunity-tasks-section';

interface OpportunityTimelineDialogProps {
  opportunity: OpportunityDto;
  orgId: string;
  users: UserDto[];
  contacts: ContactListItemDto[];
  canEdit: boolean;
  onClose: () => void;
}

/**
 * Timeline por oportunidade: interações + tarefas mescladas em ordem
 * cronológica à esquerda; criação/gestão de tarefas à direita — tarefa
 * sempre compõe a timeline, não é uma lista separada.
 */
export function OpportunityTimelineDialog({
  opportunity, orgId, users, contacts, canEdit, onClose,
}: OpportunityTimelineDialogProps) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{opportunity.title}</DialogTitle>
        </DialogHeader>

        <Link
          href={`/crm/oportunidades/${opportunity.id}`}
          className="-mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Abrir página completa <ExternalLink size={12} />
        </Link>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <OpportunityTimeline
            opportunityId={opportunity.id}
            contacts={contacts}
            canEdit={canEdit}
          />

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
