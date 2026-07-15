import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { PipelineDto, OpportunityDto, PipelineSummaryDto } from '@bioinfood/shared';
import { getSession } from '@/lib/auth';
import { CrmTabs } from './_components/crm-tabs';

const API = process.env.NEXT_PUBLIC_API_URL;

async function fetchJson<T>(path: string, token: string, fallback: T): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return fallback;
  return res.json();
}

export default async function CrmPage() {
  const session = await getSession();
  if (!session || session.role === 'CLIENTE') redirect('/projects');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const pipelines = await fetchJson<PipelineDto[]>('/pipelines', token, []);
  const current = pipelines.find((p) => p.isDefault) ?? pipelines[0] ?? null;

  const [opportunities, summary] = current
    ? await Promise.all([
        fetchJson<OpportunityDto[]>(`/opportunities?pipelineId=${current.id}`, token, []),
        fetchJson<PipelineSummaryDto | null>(`/pipelines/${current.id}/summary`, token, null),
      ])
    : [[], null];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1D1D1B]">CRM — Funil de Oportunidades</h1>
        <p className="text-sm text-[#706F6F] mt-0.5">Arraste os cards entre as etapas para atualizar o funil</p>
      </div>
      <CrmTabs
        pipelines={pipelines}
        currentPipeline={current}
        initialOpportunities={opportunities}
        summary={summary}
        canEdit={session.role === 'ADMIN'}
      />
    </div>
  );
}
