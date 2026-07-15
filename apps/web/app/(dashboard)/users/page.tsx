import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserDto } from '@bioinfood/shared';
import { getSession } from '@/lib/auth';
import UsersClient from '@/components/users/users-client';

async function getUsers(token: string): Promise<UserDto[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.users ?? [];
}

export default async function UsersPage() {
  const session = await getSession();
  if (!session || !['ADMIN', 'APROVA'].includes(session.role)) redirect('/projects');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const users = await getUsers(token);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1B]">Usuários</h1>
          <p className="text-sm text-[#706F6F] mt-0.5">Gestão de usuários do sistema</p>
        </div>
      </div>
      <UsersClient users={users} />
    </div>
  );
}
