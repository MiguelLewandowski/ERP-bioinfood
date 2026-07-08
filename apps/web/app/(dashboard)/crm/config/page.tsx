import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { PipelineDto } from '@bioinfood/shared';
import { getSession } from '@/lib/auth';
import { FunisClient } from './_components/funis-client';

export default async function FunisConfigPage() {
  const session = await getSession();
  // Configurar funis é exclusivo do ADMIN (decisão do owner).
  if (!session || session.role !== 'ADMIN') redirect('/crm');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pipelines`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const pipelines: PipelineDto[] = res.ok ? await res.json() : [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1D1D1B]">Configuração de Funis</h1>
        <p className="text-sm text-[#706F6F] mt-0.5">Crie funis e organize as etapas do kanban</p>
      </div>
      <FunisClient pipelines={pipelines} />
    </div>
  );
}
