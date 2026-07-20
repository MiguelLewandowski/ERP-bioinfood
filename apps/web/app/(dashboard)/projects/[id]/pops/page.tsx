import { cookies } from 'next/headers';
import { popsApi } from '@/lib/api-hooks';
import { PopsClient } from './_components/pops-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PopsPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const pops = await popsApi.list(id, token);

  return <PopsClient projectId={id} initialPops={pops} />;
}
