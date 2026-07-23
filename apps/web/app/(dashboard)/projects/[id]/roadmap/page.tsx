import { cookies } from 'next/headers';
import { milestonesApi } from '@/lib/api-hooks';
import { RoadmapClient } from './_components/roadmap-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RoadmapPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const milestones = await milestonesApi.list(id, token);

  // Sem token: chamadas do client vao por /api/proxy (cookie httpOnly), fora do RSC.
  return <RoadmapClient projectId={id} initialMilestones={milestones} />;
}
