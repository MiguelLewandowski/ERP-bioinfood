import { cn } from '@/lib/utils';
import type { StakeholderDto, RiskImpact, PowerInterestQuadrant } from '@bioinfood/shared';

// Grade Poder × Interesse (Modelo de Mendelow, PMBOK) — mesma metáfora visual
// do heatmap de Riscos (risk-heatmap.tsx), mas classificando em 4 quadrantes
// de engajamento em vez de um score de severidade.
const LEVELS: RiskImpact[] = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
const LEVEL_LABELS: Record<RiskImpact, string> = {
  VERY_LOW: 'Muito Baixo', LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto', VERY_HIGH: 'Muito Alto',
};

const QUADRANT_LABELS: Record<PowerInterestQuadrant, string> = {
  MANAGE_CLOSELY: 'Gerenciar de Perto',
  KEEP_SATISFIED: 'Manter Satisfeito',
  KEEP_INFORMED: 'Manter Informado',
  MONITOR: 'Monitorar',
};

// Mesma paleta do heatmap de Riscos (risk-heatmap.tsx), por prioridade de
// engajamento — mais contraste entre quadrantes que os tons de verde anteriores.
const QUADRANT_COLORS: Record<PowerInterestQuadrant, string> = {
  MANAGE_CLOSELY: '#147F23',
  KEEP_SATISFIED: '#DD8005',
  KEEP_INFORMED: '#FFB000',
  MONITOR: '#86C175',
};

function quadrantOf(powerIdx: number, interestIdx: number): PowerInterestQuadrant {
  const highPower = powerIdx >= 3; // HIGH ou VERY_HIGH
  const highInterest = interestIdx >= 3;
  if (highPower && highInterest) return 'MANAGE_CLOSELY';
  if (highPower && !highInterest) return 'KEEP_SATISFIED';
  if (!highPower && highInterest) return 'KEEP_INFORMED';
  return 'MONITOR';
}

interface StakeholderMatrixProps {
  stakeholders: StakeholderDto[];
  onCellClick?: (influence: RiskImpact, interest: RiskImpact) => void;
}

export function StakeholderMatrix({ stakeholders, onCellClick }: StakeholderMatrixProps) {
  const placed = stakeholders.filter((s) => s.influence && s.interest);

  function inCell(influence: RiskImpact, interest: RiskImpact) {
    return placed.filter((s) => s.influence === influence && s.interest === interest);
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-[480px]">
        <div className="flex items-center mb-2">
          <div className="w-24 shrink-0" />
          <div className="flex-1 text-center text-xs font-semibold text-muted-foreground mb-1">INTERESSE →</div>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-24 shrink-0" />
          {LEVELS.map((l) => (
            <div key={l} className="flex-1 text-center text-[10px] text-muted-foreground px-0.5">
              {LEVEL_LABELS[l]}
            </div>
          ))}
        </div>

        {[...LEVELS].reverse().map((influence) => {
          const powerIdx = LEVELS.indexOf(influence);
          return (
            <div key={influence} className="flex items-center mb-1">
              <div className="w-24 shrink-0 text-[10px] text-muted-foreground text-right pr-2 leading-tight">
                {LEVEL_LABELS[influence]}
              </div>
              {LEVELS.map((interest, interestIdx) => {
                const cell = inCell(influence, interest);
                const q = quadrantOf(powerIdx, interestIdx);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => onCellClick?.(influence, interest)}
                    className={cn(
                      'flex-1 h-12 mx-0.5 rounded-lg flex items-center justify-center transition-opacity',
                      'hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
                    )}
                    style={{ backgroundColor: QUADRANT_COLORS[q] }}
                    title={cell.length > 0 ? cell.map((s) => s.contact.name).join(', ') : QUADRANT_LABELS[q]}
                  >
                    {cell.length > 0 && (
                      <span className="text-xs font-bold text-white drop-shadow">{cell.length}</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        <div className="flex items-center mt-1">
          <div className="w-24 shrink-0" />
          <div className="flex-1 text-center text-xs font-semibold text-muted-foreground">← PODER (INFLUÊNCIA)</div>
        </div>

        <div className="flex gap-3 mt-4 flex-wrap">
          {(Object.keys(QUADRANT_LABELS) as PowerInterestQuadrant[]).map((q) => (
            <div key={q} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: QUADRANT_COLORS[q] }} />
              <span className="text-xs text-muted-foreground">{QUADRANT_LABELS[q]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
