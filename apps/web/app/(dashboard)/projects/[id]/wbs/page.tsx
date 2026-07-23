import { cookies } from 'next/headers';
import { projectsApi, wbsApi } from '@/lib/api-hooks';
import { extractMembers } from '@/lib/project-members';
import { WbsClient } from './_components/wbs-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WbsPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const [nodes, project] = await Promise.all([
    wbsApi.list(id, token),
    projectsApi.get(id, token),
  ]);

  return (
    <WbsClient
      projectId={id}
      token={token}
      initialNodes={nodes}
      members={extractMembers(project)}
    />
  );
}
