import { cookies } from 'next/headers';
import { stakeholdersApi } from '@/lib/api-hooks';
import { StakeholdersClient } from './_components/stakeholders-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StakeholdersPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const stakeholders = await stakeholdersApi.list(id, token);

  return <StakeholdersClient projectId={id} initialStakeholders={stakeholders} />;
}
