'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Building2, User } from 'lucide-react';
import type { CrmActivityDto } from '@bioinfood/shared';
import { cn } from '@/lib/utils';
import { bucketOf, dueDisplay } from '@/lib/crm-tasks';
import { ActivityTypeBadge } from '@/components/ui/activity-type-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';

interface TaskRowProps {
  task: CrmActivityDto;
  onToggle?: (task: CrmActivityDto) => Promise<void> | void;
  onEdit?: (task: CrmActivityDto) => void;
  /** Mostra empresa/negócio de origem — usado na aba Tarefas, não dentro do negócio. */
  showContext?: boolean;
}

/**
 * Linha de tarefa compartilhada entre a aba Tarefas e a seção dentro do
 * negócio, para que as duas telas falem o mesmo idioma visual.
 */
export function TaskRow({ task, onToggle, onEdit, showContext }: TaskRowProps) {
  // Trava o checkbox enquanto a requisição está em voo: sem isto, duplo clique
  // dispara duas mutações concorrentes de status.
  const [toggling, setToggling] = useState(false);
  const bucket = bucketOf(task);
  const done = bucket === 'done';
  const { label, exact } = dueDisplay(task.dueDate);

  async function handleToggle() {
    if (!onToggle || toggling) return;
    setToggling(true);
    try {
      await onToggle(task);
    } finally {
      setToggling(false);
    }
  }

  const org = task.organization?.tradeName ?? task.organization?.legalName;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 transition-colors',
        onEdit && 'cursor-pointer hover:border-ring',
        done && 'opacity-60',
        bucket === 'overdue' && 'border-l-2 border-l-destructive',
        bucket === 'today' && 'border-l-2 border-l-accent',
      )}
      onClick={() => onEdit?.(task)}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleToggle(); }}
        disabled={!onToggle || toggling}
        className={cn(
          'mt-0.5 shrink-0 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          done ? 'text-primary' : 'text-muted-foreground hover:text-primary',
          (!onToggle || toggling) && 'cursor-default opacity-60',
        )}
        aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'}
      >
        {done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <ActivityTypeBadge type={task.type} />
          <span className={cn('text-sm', done ? 'text-muted-foreground line-through' : 'text-foreground')}>
            {task.title}
          </span>
          {!done && task.priority !== 'MEDIUM' && <PriorityBadge priority={task.priority} />}
        </div>

        {(showContext || task.responsible) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {showContext && org && task.organization && (
              <Link
                href={`/crm/empresas/${task.organization.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-primary hover:underline"
              >
                <Building2 size={11} /> {org}
              </Link>
            )}
            {showContext && task.opportunity && (
              <span className="truncate">{task.opportunity.title}</span>
            )}
            {task.responsible && (
              <span className="flex items-center gap-1">
                <User size={11} /> {task.responsible.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Rótulo relativo dá a urgência num relance; a data exata embaixo evita
          que o usuário tenha que abrir a tarefa para saber o dia. */}
      <div className="shrink-0 text-right">
        <span
          className={cn(
            'block whitespace-nowrap text-[11px] font-medium',
            done && 'text-muted-foreground',
            !done && bucket === 'overdue' && 'text-destructive',
            !done && bucket === 'today' && 'text-accent',
            !done && bucket !== 'overdue' && bucket !== 'today' && 'text-muted-foreground',
          )}
        >
          {label}
        </span>
        {exact && (
          <span className="block whitespace-nowrap text-[10px] text-muted-foreground">
            {exact}
          </span>
        )}
      </div>
    </div>
  );
}
