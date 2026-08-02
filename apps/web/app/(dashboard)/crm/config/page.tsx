import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { pipelinesApi, taxonomiesApi } from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import { ConfigTabs, type TabId } from './_components/config-tabs';

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

const VALID_TABS: TabId[] = ['taxonomias', 'funis'];

export default async function CrmConfigPage({ searchParams }: Props) {
  const session = await getSession();
  // Configurar o CRM é exclusivo do ADMIN (decisão do owner).
  if (!session || session.role !== 'ADMIN') redirect('/crm');

  const { tab } = await searchParams;
  const initialTab: TabId = VALID_TABS.includes(tab as TabId) ? (tab as TabId) : 'taxonomias';

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [sectors, sources, engagementStages, categories, productServices, pipelines] = await Promise.all([
    taxonomiesApi.list('sectors', token, true),
    taxonomiesApi.list('sources', token, true),
    taxonomiesApi.list('engagement-stages', token, true),
    taxonomiesApi.list('categories', token, true),
    taxonomiesApi.list('product-services', token, true),
    pipelinesApi.list(token),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Configuração do CRM"
        description="Taxonomias e funis usados no cadastro de empresas e oportunidades"
      />
      <ConfigTabs
        initialTab={initialTab}
        sectors={sectors}
        sources={sources}
        engagementStages={engagementStages}
        categories={categories}
        productServices={productServices}
        pipelines={pipelines}
      />
    </div>
  );
}
