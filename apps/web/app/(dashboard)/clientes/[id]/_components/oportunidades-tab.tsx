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
  OPEN: 'bg-[#86C175]/20 text-[#156D1D]',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

export function OportunidadesTab({ opportunities }: { opportunities: OpportunityDto[] }) {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
        <p className="text-sm text-[#878787]">Nenhuma oportunidade registrada para este cliente.</p>
        <Link href="/crm" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#147F23] hover:underline">
          Abrir o funil <ExternalLink size={12} />
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {opportunities.map((o) => (
        <li key={o.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-[#1D1D1B]">{o.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#706F6F]">
                <span>{o.pipeline.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STAGE_TYPE_COLORS[o.stage.type] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {o.stage.name}
                </span>
                {o.responsible && <span>· {o.responsible.name}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#147F23]">{formatBRL(o.amount, o.currency)}</p>
              {o.probability !== null && <p className="text-[11px] text-[#878787]">{o.probability}%</p>}
            </div>
          </div>
        </li>
      ))}
      <li>
        <Link href="/crm" className="inline-flex items-center gap-1 text-xs font-medium text-[#147F23] hover:underline">
          Ver funil completo <ExternalLink size={12} />
        </Link>
      </li>
    </ul>
  );
}
