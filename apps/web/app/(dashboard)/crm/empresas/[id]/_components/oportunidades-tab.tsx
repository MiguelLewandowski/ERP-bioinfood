import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { OpportunityDto } from '@bioinfood/shared';

function formatBRL(amount: string | null, currency = 'BRL'): string {
  if (amount === null) return '—';
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(n);
}

const STAGE_TYPE_COLORS: Record<string, string> = {
  OPEN: 'bg-success/20 text-primary-dark',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

export function OportunidadesTab({ opportunities }: { opportunities: OpportunityDto[] }) {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma oportunidade registrada para este cliente.</p>
        <Link href="/crm?tab=negocios" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Abrir o funil <ExternalLink size={12} />
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {opportunities.map((o) => (
        <li key={o.id} className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">{o.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>{o.pipeline.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STAGE_TYPE_COLORS[o.stage.type] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {o.stage.name}
                </span>
                {o.responsible && <span>· {o.responsible.name}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-primary">{formatBRL(o.amount, o.currency)}</p>
              {o.probability !== null && <p className="text-[11px] text-muted-foreground">{o.probability}%</p>}
            </div>
          </div>
        </li>
      ))}
      <li>
        <Link href="/crm?tab=negocios" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Ver funil completo <ExternalLink size={12} />
        </Link>
      </li>
    </ul>
  );
}
