import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tom do número — cor entra só por token semântico (docs/design/design-tokens.md).
const TONES = {
  default: 'text-foreground',
  primary: 'text-primary',
  warning: 'text-accent',
  destructive: 'text-destructive',
} as const;

export type StatTone = keyof typeof TONES;

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Texto de apoio abaixo do número (ex.: "de 24 tarefas"). */
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  /** Torna o cartão um link para a aba que detalha o número. */
  href?: string;
  className?: string;
}

export function StatCard({
  label, value, hint, icon: Icon, tone = 'default', href, className,
}: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon size={14} aria-hidden="true" />}
        <span>{label}</span>
      </div>
      <p className={cn('mt-1.5 text-2xl font-bold tabular-nums', TONES[tone])}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </>
  );

  const base = 'rounded-xl border border-border bg-card p-4';

  if (!href) return <div className={cn(base, className)}>{body}</div>;

  return (
    <Link
      href={href}
      className={cn(
        base,
        'block transition-colors hover:border-primary/40 hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        className,
      )}
    >
      {body}
    </Link>
  );
}
