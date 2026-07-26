import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { usersApi } from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import UsersClient from '@/components/users/users-client';

const LIMIT = 20;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function UsersPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/projects');

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  // Erro de API borbulha para o error.tsx do segmento — nunca falso-vazio.
  const { items: users, total } = await usersApi.listPage({ page, limit: LIMIT }, token);

  return (
    <div className="p-6">
      <PageHeader title="Usuários" description="Gestão de usuários do sistema" />
      <UsersClient users={users} total={total} page={page} limit={LIMIT} />
    </div>
  );
}
