import { cookies } from 'next/headers';
import { projectsApi, risksApi } from '@/lib/api-hooks';
import { RisksClient } from './_components/risks-client';
import { extractMembers } from '@/lib/project-members';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RisksPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [project, risks] = await Promise.all([
    projectsApi.get(id, token),
    risksApi.list(id, token),
  ]);

  return <RisksClient projectId={id} initialRisks={risks} members={extractMembers(project)} />;
}
