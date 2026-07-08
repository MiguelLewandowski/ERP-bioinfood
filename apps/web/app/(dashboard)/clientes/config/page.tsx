import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { TaxonomyDto } from '@bioinfood/shared';
import { getSession } from '@/lib/auth';
import { TaxonomiasClient } from './_components/taxonomias-client';

const API = process.env.NEXT_PUBLIC_API_URL;

async function fetchTaxonomy(kind: string, token: string): Promise<TaxonomyDto[]> {
  const res = await fetch(`${API}/taxonomies/${kind}?includeInactive=true`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function TaxonomiasConfigPage() {
  const session = await getSession();
  // Configurar taxonomias é exclusivo do ADMIN (decisão 3 do plano CRM).
  if (!session || session.role !== 'ADMIN') redirect('/clientes');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [sectors, sources, engagementStages] = await Promise.all([
    fetchTaxonomy('sectors', token),
    fetchTaxonomy('sources', token),
    fetchTaxonomy('engagement-stages', token),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1D1D1B]">Configuração de Clientes</h1>
        <p className="text-sm text-[#706F6F] mt-0.5">Taxonomias usadas no cadastro de organizações</p>
      </div>
      <TaxonomiasClient
        sectors={sectors}
        sources={sources}
        engagementStages={engagementStages}
      />
    </div>
  );
}
