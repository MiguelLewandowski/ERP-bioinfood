import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { organizationsApi } from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import ClientesClient from '@/components/clientes/clientes-client';

export default async function ClientesPage() {
  const session = await getSession();
  if (!session || session.role === 'CLIENTE') redirect('/projects');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  // Erro de API borbulha para o error.tsx do segmento.
  const organizations = await organizationsApi.list(token);

  return (
    <div className="p-6">
      <PageHeader title="Clientes" description="Organizações cadastradas (dados mestres)" />
      <ClientesClient organizations={organizations} />
    </div>
  );
}
