'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, Clock, AlertTriangle, Snowflake } from 'lucide-react';
import type { CrmActivityDto, StaleOrganizationDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { crmActivitiesApi, organizationsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';

export function PendenciasPanel({ canEdit }: { canEdit: boolean }) {
  const { token } = useAuth();
  const [overdue, setOverdue] = useState<CrmActivityDto[]>([]);
  const [today, setToday] = useState<CrmActivityDto[]>([]);
  const [stale, setStale] = useState<StaleOrganizationDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [o, t, s] = await Promise.all([
          crmActivitiesApi.list(token, { due: 'overdue' }),
          crmActivitiesApi.list(token, { due: 'today' }),
          organizationsApi.stale(token, 30),
        ]);
        if (!cancelled) {
          setOverdue(o);
          setToday(t);
          setStale(s);
        }
      } catch (err) {
        if (!cancelled) toast.error(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  async function complete(id: string) {
    try {
      await crmActivitiesApi.update(id, { status: 'DONE' }, token);
      setOverdue((prev) => prev.filter((a) => a.id !== id));
      setToday((prev) => prev.filter((a) => a.id !== id));
      toast.success('Atividade concluída');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) {
    return <p className="text-sm text-[#878787] py-8 text-center">Carregando pendências…</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="space-y-3">
        <ActivityGroup
          title="Atrasadas"
          icon={<AlertTriangle size={15} className="text-red-600" />}
          activities={overdue}
          onComplete={canEdit ? complete : undefined}
          emptyLabel="Nenhuma atividade atrasada."
        />
        <ActivityGroup
          title="Para hoje"
          icon={<Clock size={15} className="text-[#DD8005]" />}
          activities={today}
          onComplete={canEdit ? complete : undefined}
          emptyLabel="Nada previsto para hoje."
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#1D1D1B] mb-3">
          <Snowflake size={15} className="text-[#575756]" /> Esfriando (30+ dias sem contato)
        </h3>
        {stale.length === 0 && <p className="text-xs text-[#878787]">Nenhum cliente esfriando.</p>}
        <ul className="space-y-2">
          {stale.map((org) => (
            <li key={org.id}>
              <Link href={`/clientes/${org.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50">
                <span className="text-sm text-[#1D1D1B]">{org.tradeName ?? org.legalName}</span>
                <span className="text-xs text-[#878787]">
                  {org.lastInteractionAt
                    ? `última interação em ${new Date(org.lastInteractionAt).toLocaleDateString('pt-BR')}`
                    : 'sem interação registrada'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ActivityGroup({
  title, icon, activities, onComplete, emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  activities: CrmActivityDto[];
  onComplete?: (id: string) => void;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#1D1D1B] mb-3">
        {icon} {title} {activities.length > 0 && <span className="text-xs font-medium text-[#878787]">({activities.length})</span>}
      </h3>
      {activities.length === 0 && <p className="text-xs text-[#878787]">{emptyLabel}</p>}
      <ul className="space-y-2">
        {activities.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm text-[#1D1D1B] truncate">{a.title}</p>
              <p className="text-xs text-[#878787]">
                {a.organization?.tradeName ?? a.organization?.legalName ?? a.contact?.name ?? '—'}
                {a.dueDate && ` · vence em ${new Date(a.dueDate).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
            {onComplete && (
              <button onClick={() => onComplete(a.id)} className="shrink-0 text-[#878787] hover:text-[#147F23]" aria-label="Concluir">
                <CheckCircle2 size={17} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
