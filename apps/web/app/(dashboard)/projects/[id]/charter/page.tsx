import { cookies } from 'next/headers';
import { charterApi, projectsApi, risksApi } from '@/lib/api-hooks';
import { CharterClient } from './_components/charter-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CharterPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  // Riscos entram no TAP como LEITURA. O TAP não ganha campo de risco próprio:
  // duplicar o cadastro criaria duas listas divergindo em silêncio.
  const [charter, project, risks] = await Promise.all([
    charterApi.get(id, token),
    projectsApi.get(id, token),
    risksApi.list(id, token),
  ]);

  return <CharterClient projectId={id} initialData={charter} project={project} risks={risks} />;
}
