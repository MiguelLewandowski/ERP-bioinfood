import { cookies } from 'next/headers';
import { projectsApi, tasksApi, wbsApi } from '@/lib/api-hooks';
import { resolveProjectPeople } from '@/lib/project-people';
import { computeWbsRollup } from '@/lib/project-wbs';
import { WbsClient } from './_components/wbs-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WbsPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const [nodes, project, tasks] = await Promise.all([
    wbsApi.list(id, token),
    projectsApi.get(id, token),
    tasksApi.list(id, token),
  ]);

  // O rollup é somado aqui e não no client: assim o payload leva só a contagem
  // por pacote, e não a lista inteira de tarefas do projeto.
  const rollup = Object.fromEntries(computeWbsRollup(nodes, tasks));

  // Sem `token`: as chamadas do client vão por /api/proxy (cookie httpOnly).
  // Passar o token o colocaria no payload RSC, legível pelo JS da página.
  return (
    <WbsClient
      projectId={id}
      initialNodes={nodes}
      members={await resolveProjectPeople(project, token)}
      rollup={rollup}
    />
  );
}
