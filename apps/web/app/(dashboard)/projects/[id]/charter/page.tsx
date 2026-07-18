import { cookies } from 'next/headers';
import { charterApi, projectsApi } from '@/lib/api-hooks';
import { CharterClient } from './_components/charter-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CharterPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [charter, project] = await Promise.all([
    charterApi.get(id, token),
    projectsApi.get(id, token),
  ]);

  return <CharterClient projectId={id} initialData={charter} project={project} />;
}
