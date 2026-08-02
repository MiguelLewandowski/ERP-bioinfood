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

const VALID_TABS: TabId[] = ['empresas', 'pessoas', 'oportunidades', 'tarefas'];

export default async function CrmPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role === 'CLIENTE') redirect('/projects');

  const { tab } = await searchParams;
  const initialTab: TabId = VALID_TABS.includes(tab as TabId) ? (tab as TabId) : 'tarefas';

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  // Erros de API borbulham para o error.tsx do segmento (sem falso-vazio).
  const [
    pipelines, organizations, contacts, sources, sectors, categories, productServices, users,
    allTasks,
  ] = await Promise.all([
    pipelinesApi.list(token),
    organizationsApi.list(token),
    contactsApi.list(token),
    taxonomiesApi.list('sources', token),
    taxonomiesApi.list('sectors', token),
    taxonomiesApi.list('categories', token),
    taxonomiesApi.list('product-services', token),
    usersApi.list(token),
    // Indicador de pendências nos cards do kanban — best-effort, não derruba o
    // CRM. Vem a lista inteira porque o card precisa distinguir "sem tarefa" de
    // "tem tarefa, mas só semana que vem", e não só o que está urgente hoje.
    crmActivitiesApi.list(token).catch(() => [] as CrmActivityDto[]),
  ]);
  const currentPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0] ?? null;
  const opportunityTasks = allTasks.filter((t) => t.opportunityId);

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
        description="Empresas, pessoas, oportunidades e tarefas num só lugar"
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
        opportunityTasks={opportunityTasks}
        canEdit={canEdit}
      />
    </div>
  );
}
