import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { usersApi } from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import UsersClient from '@/components/users/users-client';

export default async function UsersPage() {
  const session = await getSession();
  if (!session || !['ADMIN', 'APROVA'].includes(session.role)) redirect('/projects');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  // Erro de API borbulha para o error.tsx do segmento — nunca falso-vazio.
  const users = await usersApi.list(token);

  return (
    <div className="p-6">
      <PageHeader title="Usuários" description="Gestão de usuários do sistema" />
      <UsersClient users={users} />
    </div>
  );
}
