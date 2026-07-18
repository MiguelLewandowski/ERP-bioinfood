import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { OpportunityDto, PipelineSummaryDto } from '@bioinfood/shared';
import { getSession } from '@/lib/auth';
import { opportunitiesApi, pipelinesApi } from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import { CrmTabs } from './_components/crm-tabs';

export default async function CrmPage() {
  const session = await getSession();
  if (!session || session.role === 'CLIENTE') redirect('/projects');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  // Erros de API borbulham para o error.tsx do segmento (sem falso-vazio).
  const pipelines = await pipelinesApi.list(token);
  const current = pipelines.find((p) => p.isDefault) ?? pipelines[0] ?? null;

  const [opportunities, summary] = current
    ? await Promise.all([
        opportunitiesApi.list(current.id, token),
        pipelinesApi.summary(current.id, token).catch(() => null as PipelineSummaryDto | null),
      ])
    : [[] as OpportunityDto[], null];

  return (
    <div className="p-6">
      <PageHeader
        title="CRM — Funil de Oportunidades"
        description="Arraste os cards entre as etapas para atualizar o funil"
      />
      <CrmTabs
        pipelines={pipelines}
        currentPipeline={current}
        initialOpportunities={opportunities}
        summary={summary}
        canEdit={session.role === 'ADMIN'}
      />
    </div>
  );
}
