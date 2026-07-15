import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { OrganizationDto } from '@bioinfood/shared';
import { getSession } from '@/lib/auth';
import ClientesClient from '@/components/clientes/clientes-client';

async function getOrganizations(token: string): Promise<OrganizationDto[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function ClientesPage() {
  const session = await getSession();
  if (!session || session.role === 'CLIENTE') redirect('/projects');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const organizations = await getOrganizations(token);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1B]">Clientes</h1>
          <p className="text-sm text-[#706F6F] mt-0.5">Organizações cadastradas (dados mestres)</p>
        </div>
      </div>
      <ClientesClient organizations={organizations} />
    </div>
  );
}
