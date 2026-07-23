import { cookies } from 'next/headers';
import { tasksApi } from '@/lib/api-hooks';
import { computeMethodology } from '@/lib/project-pops';
import { MethodologyClient } from './_components/methodology-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MethodologyPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  // Sem endpoint dedicado: a lista de tarefas já devolve as POPs de cada uma.
  const tasks = await tasksApi.list(id, token);

  return <MethodologyClient projectId={id} methodology={computeMethodology(tasks)} />;
}
