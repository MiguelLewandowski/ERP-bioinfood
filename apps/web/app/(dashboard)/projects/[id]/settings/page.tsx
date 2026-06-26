import { cookies } from 'next/headers';
import { ProjectSettingsClient } from './_components/project-settings-client';

async function getProject(id: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectSettingsPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const project = await getProject(id, token);

  return <ProjectSettingsClient projectId={id} token={token} project={project} />;
}
