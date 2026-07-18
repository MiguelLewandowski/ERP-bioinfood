'use client';

import { useState } from 'react';
import { Tags, Kanban } from 'lucide-react';
import type { TaxonomyDto, PipelineDto } from '@bioinfood/shared';
import { cn } from '@/lib/utils';
import { TaxonomiasClient } from './taxonomias-client';
import { FunisClient } from './funis-client';

interface ConfigTabsProps {
  initialTab: TabId;
  sectors: TaxonomyDto[];
  sources: TaxonomyDto[];
  engagementStages: TaxonomyDto[];
  categories: TaxonomyDto[];
  productServices: TaxonomyDto[];
  pipelines: PipelineDto[];
}

const TABS = [
  { id: 'taxonomias', label: 'Taxonomias', icon: Tags },
  { id: 'funis', label: 'Funis', icon: Kanban },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export function ConfigTabs(props: ConfigTabsProps) {
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

      {tab === 'taxonomias' && (
        <TaxonomiasClient
          sectors={props.sectors}
          sources={props.sources}
          engagementStages={props.engagementStages}
          categories={props.categories}
          productServices={props.productServices}
        />
      )}
      {tab === 'funis' && <FunisClient pipelines={props.pipelines} />}
    </>
  );
}
