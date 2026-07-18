import { cookies } from 'next/headers';
import { projectsApi, tasksApi } from '@/lib/api-hooks';
import { BacklogClient } from './_components/backlog-client';
import { extractMembers } from '@/lib/project-members';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BacklogPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [project, tasks] = await Promise.all([
    projectsApi.get(id, token),
    tasksApi.list(id, token),
  ]);

  return <BacklogClient projectId={id} initialTasks={tasks} members={extractMembers(project)} />;
}
