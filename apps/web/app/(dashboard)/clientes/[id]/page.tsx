import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type {
  OrganizationDetailDto, TaxonomyDto, ContactListItemDto, InteractionDto, OpportunityDto,
} from '@bioinfood/shared';
import { getSession } from '@/lib/auth';
import { FichaClient } from './_components/ficha-client';

const API = process.env.NEXT_PUBLIC_API_URL;

async function fetchJson<T>(path: string, token: string, fallback: T): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return fallback;
  return res.json();
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientePage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role === 'PORTAL') redirect('/projects');

  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const organization = await fetchJson<OrganizationDetailDto | null>(
    `/organizations/${id}`, token, null,
  );
  if (!organization) {
    return (
      <div className="p-6">
        <p className="text-sm text-[#706F6F]">Cliente não encontrado.</p>
      </div>
    );
  }

  const [sectors, sources, contacts, interactions, opportunities] = await Promise.all([
    fetchJson<TaxonomyDto[]>('/taxonomies/sectors', token, []),
    fetchJson<TaxonomyDto[]>('/taxonomies/sources', token, []),
    fetchJson<ContactListItemDto[]>(`/contacts?orgId=${id}`, token, []),
    fetchJson<InteractionDto[]>(`/interactions?orgId=${id}`, token, []),
    fetchJson<OpportunityDto[]>(`/opportunities?orgId=${id}`, token, []),
  ]);

  // Escrita do CRM é exclusiva do ADMIN (decisão do owner).
  const canEdit = session.role === 'ADMIN';
  const canManageRoles = session.role === 'ADMIN';

  return (
    <FichaClient
      organizationId={id}
      organization={organization}
      sectors={sectors}
      sources={sources}
      contacts={contacts}
      interactions={interactions}
      opportunities={opportunities}
      canEdit={canEdit}
      canManageRoles={canManageRoles}
    />
  );
}
