import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { CrmActivityDto, OpportunityDto, PipelineSummaryDto } from '@bioinfood/shared';
import { getSession } from '@/lib/auth';
import {
  contactsApi, crmActivitiesApi, opportunitiesApi, organizationsApi, pipelinesApi, taxonomiesApi, usersApi,
} from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import { CrmTabs, type TabId } from './_components/crm-tabs';

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

const VALID_TABS: TabId[] = ['empresas', 'pessoas', 'negocios', 'tarefas'];

export default async function CrmPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role === 'CLIENTE') redirect('/projects');

  const { tab } = await searchParams;
  const initialTab: TabId = VALID_TABS.includes(tab as TabId) ? (tab as TabId) : 'negocios';

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  // Erros de API borbulham para o error.tsx do segmento (sem falso-vazio).
  const [
    pipelines, organizations, contacts, sources, sectors, categories, productServices, users,
    overdueTasks, todayTasks,
  ] = await Promise.all([
    pipelinesApi.list(token),
    organizationsApi.list(token),
    contactsApi.list(token),
    taxonomiesApi.list('sources', token),
    taxonomiesApi.list('sectors', token),
    taxonomiesApi.list('categories', token),
    taxonomiesApi.list('product-services', token),
    usersApi.list(token),
    // Sinal de urgência nos cards do kanban — best-effort, não derruba o CRM.
    crmActivitiesApi.list(token, { due: 'overdue' }).catch(() => [] as CrmActivityDto[]),
    crmActivitiesApi.list(token, { due: 'today' }).catch(() => [] as CrmActivityDto[]),
  ]);
  const currentPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0] ?? null;
  // Atrasadas antes das de hoje — a primeira ocorrência por negócio "vence" no map do client.
  const urgentTasks = [...overdueTasks, ...todayTasks].filter((t) => t.opportunityId);

  const [opportunities, summary] = currentPipeline
    ? await Promise.all([
        opportunitiesApi.list(currentPipeline.id, token),
        pipelinesApi.summary(currentPipeline.id, token).catch(() => null as PipelineSummaryDto | null),
      ])
    : [[] as OpportunityDto[], null];

  const canEdit = session.role === 'ADMIN';

  return (
    <div className="p-6">
      <PageHeader
        title="CRM"
        description="Empresas, pessoas, negócios e tarefas num só lugar"
      />
      <CrmTabs
        initialTab={initialTab}
        organizations={organizations}
        contacts={contacts}
        sources={sources}
        sectors={sectors}
        categories={categories}
        productServices={productServices}
        users={users}
        pipelines={pipelines}
        currentPipeline={currentPipeline}
        initialOpportunities={opportunities}
        summary={summary}
        urgentTasks={urgentTasks}
        canEdit={canEdit}
      />
    </div>
  );
}
