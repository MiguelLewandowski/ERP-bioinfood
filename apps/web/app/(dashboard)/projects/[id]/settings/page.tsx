import { cookies } from 'next/headers';
import { projectsApi } from '@/lib/api-hooks';
import { ProjectSettingsClient } from './_components/project-settings-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectSettingsPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const project = await projectsApi.get(id, token);

  return <ProjectSettingsClient projectId={id} token={token} project={project} />;
}
