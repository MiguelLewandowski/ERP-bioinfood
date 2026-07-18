'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, Clock, AlertTriangle, Snowflake } from 'lucide-react';
import type { CrmActivityDto, StaleOrganizationDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { crmActivitiesApi, organizationsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { Card } from '@/components/ui/card';

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
    return <p className="py-8 text-center text-sm text-muted-foreground">Carregando pendências…</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="space-y-3">
        <ActivityGroup
          title="Atrasadas"
          icon={<AlertTriangle size={15} className="text-destructive" />}
          activities={overdue}
          onComplete={canEdit ? complete : undefined}
          emptyLabel="Nenhuma atividade atrasada."
        />
        <ActivityGroup
          title="Para hoje"
          icon={<Clock size={15} className="text-accent" />}
          activities={today}
          onComplete={canEdit ? complete : undefined}
          emptyLabel="Nada previsto para hoje."
        />
      </section>

      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Snowflake size={15} className="text-muted-foreground" /> Esfriando (30+ dias sem contato)
        </h3>
        {stale.length === 0 && <p className="text-xs text-muted-foreground">Nenhum cliente esfriando.</p>}
        <ul className="space-y-2">
          {stale.map((org) => (
            <li key={org.id}>
              <Link
                href={`/crm/empresas/${org.id}`}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <span className="text-sm text-foreground">{org.tradeName ?? org.legalName}</span>
                <span className="text-xs text-muted-foreground">
                  {org.lastInteractionAt
                    ? `última interação em ${new Date(org.lastInteractionAt).toLocaleDateString('pt-BR')}`
                    : 'sem interação registrada'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
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
    <Card className="p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-foreground">
        {icon} {title}{' '}
        {activities.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground">({activities.length})</span>
        )}
      </h3>
      {activities.length === 0 && <p className="text-xs text-muted-foreground">{emptyLabel}</p>}
      <ul className="space-y-2">
        {activities.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{a.title}</p>
              <p className="text-xs text-muted-foreground">
                {a.organization?.tradeName ?? a.organization?.legalName ?? a.contact?.name ?? '—'}
                {a.dueDate && ` · vence em ${new Date(a.dueDate).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
            {onComplete && (
              <button
                onClick={() => onComplete(a.id)}
                className="shrink-0 rounded text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Concluir"
              >
                <CheckCircle2 size={17} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
