'use client';

import { useState } from 'react';
import { Kanban, ListChecks } from 'lucide-react';
import type { PipelineDto, OpportunityDto, PipelineSummaryDto } from '@bioinfood/shared';
import { cn } from '@/lib/utils';
import { CrmClient } from './crm-client';
import { PendenciasPanel } from './pendencias-panel';

interface CrmTabsProps {
  pipelines: PipelineDto[];
  currentPipeline: PipelineDto | null;
  initialOpportunities: OpportunityDto[];
  summary: PipelineSummaryDto | null;
  canEdit: boolean;
}

const TABS = [
  { id: 'funil', label: 'Funil', icon: Kanban },
  { id: 'pendencias', label: 'Pendências', icon: ListChecks },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function CrmTabs(props: CrmTabsProps) {
  const [tab, setTab] = useState<TabId>('funil');

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

      {tab === 'funil' && <CrmClient {...props} />}
      {tab === 'pendencias' && <PendenciasPanel canEdit={props.canEdit} />}
    </>
  );
}
