import { cookies } from 'next/headers';
import { GanttClient } from './_components/gantt-client';
import type { TaskDto as Task, MilestoneDto as Milestone } from '@bioinfood/shared';

async function fetchJson<T>(url: string, token: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as T;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GanttPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const base = process.env.NEXT_PUBLIC_API_URL;

  const [project, tasks, milestones] = await Promise.all([
    fetchJson<{ startDate: string | null; endDate: string | null; name: string }>(`${base}/projects/${id}`, token),
    fetchJson<Task[]>(`${base}/projects/${id}/tasks`, token),
    fetchJson<Milestone[]>(`${base}/projects/${id}/milestones`, token),
  ]);

  return (
    <GanttClient
      projectId={id}
      token={token}
      tasks={tasks ?? []}
      milestones={milestones ?? []}
      projectStart={project?.startDate ?? null}
      projectEnd={project?.endDate ?? null}
    />
  );
}
