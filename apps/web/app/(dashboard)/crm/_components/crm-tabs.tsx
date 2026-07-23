'use client';

import { useRef, useState } from 'react';
import { Building2, Users as UsersIcon, Kanban, ListChecks } from 'lucide-react';
import type {
  PipelineDto, OpportunityDto, PipelineSummaryDto, OrganizationDto, ContactListItemDto, TaxonomyDto,
  CrmActivityDto, UserDto,
} from '@bioinfood/shared';
import { cn } from '@/lib/utils';
import ClientesClient from '@/components/clientes/clientes-client';
import { CrmClient } from './crm-client';
import { TarefasTab } from './tarefas-tab';
import { PessoasTab } from './pessoas-tab';

interface CrmTabsProps {
  initialTab: TabId;
  organizations: OrganizationDto[];
  contacts: ContactListItemDto[];
  sources: TaxonomyDto[];
  sectors: TaxonomyDto[];
  categories: TaxonomyDto[];
  productServices: TaxonomyDto[];
  users: UserDto[];
  pipelines: PipelineDto[];
  currentPipeline: PipelineDto | null;
  initialOpportunities: OpportunityDto[];
  summary: PipelineSummaryDto | null;
  opportunityTasks: CrmActivityDto[];
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
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /**
   * Troca a aba e reflete na URL.
   *
   * `history.replaceState` em vez de `router.replace`: a página é Server
   * Component e uma navegação real refaria todas as buscas do CRM só para
   * mudar de aba. Assim o recarregar e o compartilhar link caem na aba certa,
   * sem custo de rede e sem encher o histórico de voltas.
   */
  function selectTab(id: TabId) {
    setTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', id);
    window.history.replaceState(null, '', url);
  }

  // Setas navegam entre abas — comportamento esperado do padrão ARIA tabs.
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    const next = TABS[(index + delta + TABS.length) % TABS.length];
    selectTab(next.id);
    tabRefs.current[next.id]?.focus();
  }

  return (
    <>
      <div className="mb-5 flex gap-1 border-b border-border" role="tablist" aria-label="Seções do CRM">
        {TABS.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            ref={(el) => { tabRefs.current[id] = el; }}
            role="tab"
            id={`crm-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`crm-panel-${id}`}
            // Só a aba ativa entra na ordem de tabulação; as outras vêm pelas setas.
            tabIndex={tab === id ? 0 : -1}
            onClick={() => selectTab(id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={15} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`crm-panel-${tab}`} aria-labelledby={`crm-tab-${tab}`}>
        {tab === 'empresas' && (
          <ClientesClient
            organizations={props.organizations}
            sectors={props.sectors}
            sources={props.sources}
            categories={props.categories}
            productServices={props.productServices}
            users={props.users}
          />
        )}
        {tab === 'pessoas' && (
          <PessoasTab initialContacts={props.contacts} sources={props.sources} canEdit={props.canEdit} />
        )}
        {tab === 'negocios' && (
          <CrmClient
            pipelines={props.pipelines}
            currentPipeline={props.currentPipeline}
            initialOpportunities={props.initialOpportunities}
            summary={props.summary}
            initialTasks={props.opportunityTasks}
            users={props.users}
            canEdit={props.canEdit}
          />
        )}
        {tab === 'tarefas' && <TarefasTab users={props.users} canEdit={props.canEdit} />}
      </div>
    </>
  );
}
