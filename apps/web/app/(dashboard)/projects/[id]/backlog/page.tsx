import { cookies } from 'next/headers';
import type { ProjectDto } from '@bioinfood/shared';
import { BacklogClient } from './_components/backlog-client';
import { extractMembers } from '@/lib/project-members';

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

export default async function BacklogPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [project, tasks] = await Promise.all([
    fetchJson<ProjectDto | null>(`/projects/${id}`, token, null),
    fetchJson(`/projects/${id}/tasks`, token, []),
  ]);

  return <BacklogClient projectId={id} initialTasks={tasks} members={extractMembers(project)} />;
}
