import { cookies } from 'next/headers';
import type { ProjectDto, TaskDto } from '@bioinfood/shared';
import { ProjectActivitiesClient } from './_components/project-activities-client';

async function fetchJson<T>(path: string, token: string, fallback: T): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return fallback;
  return res.json();
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectActivitiesPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [project, tasks] = await Promise.all([
    fetchJson<ProjectDto | null>(`/projects/${id}`, token, null),
    fetchJson<TaskDto[]>(`/projects/${id}/tasks`, token, []),
  ]);

  // Responsáveis possíveis: criador do projeto + usuários com acesso.
  const memberMap = new Map<string, { id: string; name: string }>();
  if (project?.createdBy) memberMap.set(project.createdBy.id, project.createdBy);
  for (const a of project?.accesses ?? []) memberMap.set(a.user.id, a.user);

  return (
    <ProjectActivitiesClient
      projectId={id}
      projectName={project?.name ?? ''}
      members={Array.from(memberMap.values())}
      initialTasks={tasks}
    />
  );
}
