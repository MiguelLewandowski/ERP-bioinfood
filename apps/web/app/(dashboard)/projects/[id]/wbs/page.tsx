import { cookies } from 'next/headers';
import { WbsClient } from './_components/wbs-client';

async function getWbs(projectId: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/wbs`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WbsPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const nodes = await getWbs(id, token);

  return <WbsClient projectId={id} token={token} initialNodes={nodes} />;
}
