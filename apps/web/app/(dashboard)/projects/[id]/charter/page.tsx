import { cookies } from 'next/headers';
import type { ProjectDto } from '@bioinfood/shared';
import { CharterClient } from './_components/charter-client';

async function getCharter(projectId: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/charter`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function getProject(projectId: string, token: string): Promise<ProjectDto | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CharterPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const [charter, project] = await Promise.all([
    getCharter(id, token),
    getProject(id, token),
  ]);

  return <CharterClient projectId={id} initialData={charter} project={project} />;
}
