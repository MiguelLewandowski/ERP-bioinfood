import { cn } from '@/lib/utils';
import type { RiskDto } from '@bioinfood/shared';

const LEVELS = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const;
const LEVEL_LABELS: Record<string, string> = {
  VERY_LOW: 'Muito Baixo', LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto', VERY_HIGH: 'Muito Alto',
};
const LEVEL_NUM: Record<string, number> = { VERY_LOW: 1, LOW: 2, MEDIUM: 3, HIGH: 4, VERY_HIGH: 5 };

function cellColor(prob: number, impact: number): string {
  const score = prob * impact;
  if (score >= 16) return '#D64550';
  if (score >= 9)  return '#DD8005';
  if (score >= 4)  return '#FFB000';
  return '#86C175';
}

interface RiskHeatmapProps {
  risks: Pick<RiskDto, 'id' | 'title' | 'probability' | 'impact' | 'score'>[];
  onCellClick?: (prob: string, impact: string) => void;
}

export function RiskHeatmap({ risks, onCellClick }: RiskHeatmapProps) {
  function risksInCell(prob: string, impact: string) {
    return risks.filter((r) => r.probability === prob && r.impact === impact);
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-[480px]">
        <div className="flex items-center mb-2">
          <div className="w-24 shrink-0" />
          <div className="flex-1 text-center text-xs font-semibold text-muted-foreground mb-1">IMPACTO →</div>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-24 shrink-0" />
          {LEVELS.map((l) => (
            <div key={l} className="flex-1 text-center text-[10px] text-muted-foreground px-0.5">
              {LEVEL_LABELS[l]}
            </div>
          ))}
        </div>

        {[...LEVELS].reverse().map((prob) => (
          <div key={prob} className="flex items-center mb-1">
            <div className="w-24 shrink-0 text-[10px] text-muted-foreground text-right pr-2 leading-tight">
              {LEVEL_LABELS[prob]}
            </div>
            {LEVELS.map((impact) => {
              const cell = risksInCell(prob, impact);
              const bg = cellColor(LEVEL_NUM[prob], LEVEL_NUM[impact]);
              return (
                <button
                  key={impact}
                  onClick={() => onCellClick?.(prob, impact)}
                  className={cn(
                    'flex-1 h-12 mx-0.5 rounded-lg flex items-center justify-center transition-opacity',
                    'hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
                  )}
                  style={{ backgroundColor: bg }}
                  title={cell.length > 0 ? cell.map((r) => r.title).join(', ') : undefined}
                >
                  {cell.length > 0 && (
                    <span className="text-xs font-bold text-white drop-shadow">{cell.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        <div className="flex items-center mt-1">
          <div className="w-24 shrink-0" />
          <div className="flex-1 text-center text-xs font-semibold text-muted-foreground">← PROBABILIDADE</div>
        </div>

        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { color: '#86C175', label: 'Baixo (1–3)' },
            { color: '#FFB000', label: 'Moderado (4–8)' },
            { color: 'hsl(var(--accent))', label: 'Alto (9–15)' },
            { color: 'hsl(var(--destructive))', label: 'Crítico (16–25)' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
