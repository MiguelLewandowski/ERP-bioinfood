import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const session = await getSession();
  if (!session || !['ADMIN', 'APROVA'].includes(session.role)) redirect('/projects');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
      <p className="text-sm text-gray-500 mt-1">Gestão de usuários do sistema</p>
    </div>
  );
}
