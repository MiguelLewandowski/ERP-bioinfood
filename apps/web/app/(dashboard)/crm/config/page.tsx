import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { pipelinesApi } from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import { FunisClient } from './_components/funis-client';

export default async function FunisConfigPage() {
  const session = await getSession();
  // Configurar funis é exclusivo do ADMIN (decisão do owner).
  if (!session || session.role !== 'ADMIN') redirect('/crm');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const pipelines = await pipelinesApi.list(token);

  return (
    <div className="p-6">
      <PageHeader
        title="Configuração de Funis"
        description="Crie funis e organize as etapas do kanban"
      />
      <FunisClient pipelines={pipelines} />
    </div>
  );
}
