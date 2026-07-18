import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { taxonomiesApi } from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import { TaxonomiasClient } from './_components/taxonomias-client';

export default async function TaxonomiasConfigPage() {
  const session = await getSession();
  // Configurar taxonomias é exclusivo do ADMIN (decisão 3 do plano CRM).
  if (!session || session.role !== 'ADMIN') redirect('/clientes');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [sectors, sources, engagementStages, categories, productServices] = await Promise.all([
    taxonomiesApi.list('sectors', token, true),
    taxonomiesApi.list('sources', token, true),
    taxonomiesApi.list('engagement-stages', token, true),
    taxonomiesApi.list('categories', token, true),
    taxonomiesApi.list('product-services', token, true),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Configuração de Clientes"
        description="Taxonomias usadas no cadastro de organizações"
      />
      <TaxonomiasClient
        sectors={sectors}
        sources={sources}
        engagementStages={engagementStages}
        categories={categories}
        productServices={productServices}
      />
    </div>
  );
}
