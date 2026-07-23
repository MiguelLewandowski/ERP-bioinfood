import { cn } from '@/lib/utils';

interface ProgressBarProps {
  /** Percentual de 0 a 100. Valores fora da faixa são grampeados. */
  value: number;
  /** Descrição do que a barra representa, para leitor de tela. */
  label: string;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({ value, label, className, barClassName }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn('h-full rounded-full bg-primary transition-all', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
