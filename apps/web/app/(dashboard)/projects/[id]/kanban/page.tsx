import { cookies } from 'next/headers';
import { KanbanClient } from './_components/kanban-client';

async function getTasks(projectId: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function KanbanPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const tasks = await getTasks(id, token);

  return <KanbanClient projectId={id} initialTasks={tasks} />;
}
