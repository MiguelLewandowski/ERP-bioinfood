'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, User } from 'lucide-react';
import type { ContactListItemDto, OpportunityDto, UserDto } from '@bioinfood/shared';
import { formatBRL } from '../../../_components/crm-card';
import { OpportunityTimeline } from '../../../_components/opportunity-timeline';
import { OpportunityTasksSection } from '../../../_components/opportunity-tasks-section';

const STAGE_TYPE_COLORS: Record<string, string> = {
  OPEN: 'bg-success/20 text-primary-dark',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

interface OpportunityDetailClientProps {
  opportunity: OpportunityDto;
  contacts: ContactListItemDto[];
  users: UserDto[];
  canEdit: boolean;
}

export function OpportunityDetailClient({
  opportunity, contacts, users, canEdit,
}: OpportunityDetailClientProps) {
  const org = opportunity.organization.tradeName ?? opportunity.organization.legalName;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link
        href={`/crm/empresas/${opportunity.organization.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={14} /> Voltar para {org}
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">{opportunity.title}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 size={13} />
            <Link href={`/crm/empresas/${opportunity.organization.id}`} className="hover:text-primary hover:underline">
              {org}
            </Link>
          </span>
          <span>{opportunity.pipeline.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STAGE_TYPE_COLORS[opportunity.stage.type] ?? 'bg-muted text-muted-foreground'}`}
          >
            {opportunity.stage.name}
          </span>
          {opportunity.responsible && (
            <span className="flex items-center gap-1">
              <User size={13} /> {opportunity.responsible.name}
            </span>
          )}
          <span className="text-sm font-semibold text-primary">
            {formatBRL(opportunity.amount, opportunity.currency)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <OpportunityTimeline
          opportunityId={opportunity.id}
          contacts={contacts}
          canEdit={canEdit}
          listClassName=""
        />

        <div className="min-w-0">
          <OpportunityTasksSection
            opportunityId={opportunity.id}
            orgId={opportunity.organization.id}
            users={users}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  );
}
