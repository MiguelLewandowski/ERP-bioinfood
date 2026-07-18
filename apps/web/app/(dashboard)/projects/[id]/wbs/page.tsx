import { cookies } from 'next/headers';
import { wbsApi } from '@/lib/api-hooks';
import { WbsClient } from './_components/wbs-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WbsPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const nodes = await wbsApi.list(id, token);

  return <WbsClient projectId={id} token={token} initialNodes={nodes} />;
}
