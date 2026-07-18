'use client';

import { useState } from 'react';
import { Building2, Users as UsersIcon, Kanban, ListChecks } from 'lucide-react';
import type {
  PipelineDto, OpportunityDto, PipelineSummaryDto, OrganizationDto, ContactListItemDto, TaxonomyDto,
} from '@bioinfood/shared';
import { cn } from '@/lib/utils';
import ClientesClient from '@/components/clientes/clientes-client';
import { CrmClient } from './crm-client';
import { PendenciasPanel } from './pendencias-panel';
import { PessoasTab } from './pessoas-tab';

interface CrmTabsProps {
  initialTab: TabId;
  organizations: OrganizationDto[];
  contacts: ContactListItemDto[];
  sources: TaxonomyDto[];
  pipelines: PipelineDto[];
  currentPipeline: PipelineDto | null;
  initialOpportunities: OpportunityDto[];
  summary: PipelineSummaryDto | null;
  canEdit: boolean;
}

const TABS = [
  { id: 'empresas', label: 'Empresas', icon: Building2 },
  { id: 'pessoas', label: 'Pessoas', icon: UsersIcon },
  { id: 'negocios', label: 'Negócios', icon: Kanban },
  { id: 'tarefas', label: 'Tarefas', icon: ListChecks },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export function CrmTabs(props: CrmTabsProps) {
  const [tab, setTab] = useState<TabId>(props.initialTab);

  return (
    <>
      <div className="mb-5 flex gap-1 border-b border-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'empresas' && <ClientesClient organizations={props.organizations} />}
      {tab === 'pessoas' && (
        <PessoasTab initialContacts={props.contacts} sources={props.sources} canEdit={props.canEdit} />
      )}
      {tab === 'negocios' && (
        <CrmClient
          pipelines={props.pipelines}
          currentPipeline={props.currentPipeline}
          initialOpportunities={props.initialOpportunities}
          summary={props.summary}
          canEdit={props.canEdit}
        />
      )}
      {tab === 'tarefas' && <PendenciasPanel canEdit={props.canEdit} />}
    </>
  );
}
