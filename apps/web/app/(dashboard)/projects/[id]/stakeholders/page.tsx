import { cookies } from 'next/headers';
import { StakeholdersClient } from './_components/stakeholders-client';

async function getStakeholders(projectId: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/stakeholders`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StakeholdersPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const stakeholders = await getStakeholders(id, token);

  return <StakeholdersClient projectId={id} initialStakeholders={stakeholders} />;
}
