import { cookies } from 'next/headers';
import { popsApi } from '@/lib/api-hooks';
import { PopsClient } from './_components/pops-client';

export default async function PopsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const pops = await popsApi.list(token);

  return <PopsClient initialPops={pops} />;
}
