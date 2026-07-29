import { cookies } from 'next/headers';
import { projectsApi, tasksApi } from '@/lib/api-hooks';
import { KanbanClient } from './_components/kanban-client';
import { resolveProjectPeople } from '@/lib/project-people';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function KanbanPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [project, tasks] = await Promise.all([
    projectsApi.get(id, token),
    tasksApi.list(id, token),
  ]);

  return <KanbanClient projectId={id} initialTasks={tasks} members={await resolveProjectPeople(project, token)} />;
}
