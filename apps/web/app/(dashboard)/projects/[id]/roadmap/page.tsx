import { cookies } from 'next/headers';
import { RoadmapClient } from './_components/roadmap-client';

async function getMilestones(projectId: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/milestones`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RoadmapPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const milestones = await getMilestones(id, token);

  return <RoadmapClient projectId={id} token={token} initialMilestones={milestones} />;
}
