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
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === id
                ? 'border-[#147F23] text-[#147F23]'
                : 'border-transparent text-[#575756] hover:text-[#1D1D1B]',
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
