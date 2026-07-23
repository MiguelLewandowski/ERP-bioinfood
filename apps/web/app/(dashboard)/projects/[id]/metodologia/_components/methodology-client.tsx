'use client'; // expande/recolhe a lista de tarefas de cada POP

import { useState } from 'react';
import Link from 'next/link';
import {
  FileCheck, ChevronRight, ChevronDown, AlertTriangle, FlaskConical, ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import type { ProjectMethodology, PopUsage } from '@/lib/project-pops';
import { popsWithVersionDrift } from '@/lib/project-pops';

interface Props {
  projectId: string;
  methodology: ProjectMethodology;
}

export function MethodologyClient({ projectId, methodology }: Props) {
  const { pops, tasksWithoutPop, totalTasks, tasksWithPop, coverage } = methodology;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const drift = popsWithVersionDrift(pops);

  function toggle(popId: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(popId) ? next.delete(popId) : next.add(popId);
      return next;
    });
  }

  if (totalTasks === 0) {
    return (
      <div className="p-6">
        <Header />
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-20">
          <FlaskConical size={36} className="text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Este projeto ainda não tem tarefas — logo, nenhuma POP em uso.
          </p>
          <Link href={`/projects/${projectId}/backlog`} className="text-sm font-semibold text-primary hover:underline">
            Ir para o Backlog →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <Header />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="POPs em uso" value={pops.length} icon={FileCheck} tone="primary" />
        <StatCard
          label="Cobertura"
          value={`${coverage}%`}
          hint={`${tasksWithPop} de ${totalTasks} tarefas`}
          icon={ListChecks}
        />
        <StatCard
          label="Tarefas sem POP"
          value={tasksWithoutPop.length}
          hint="trabalho sem procedimento registrado"
          icon={AlertTriangle}
          tone={tasksWithoutPop.length > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Divergência de versão"
          value={drift.length}
          hint="mesma POP em revisões diferentes"
          icon={AlertTriangle}
          tone={drift.length > 0 ? 'destructive' : 'default'}
        />
      </div>

      {drift.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-destructive">
            <AlertTriangle size={13} /> Tarefas seguindo revisões diferentes do mesmo procedimento
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {drift.map((p) => (
              <li key={p.popId} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{p.title}</span>
                {' — versões '}{p.versions.map((v) => `v${v}`).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-bold text-foreground">POPs utilizadas</h3>
          <p className="text-xs text-muted-foreground">Clique numa POP para ver em que tarefas ela é aplicada.</p>
        </div>

        {pops.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhuma tarefa deste projeto tem POP vinculada ainda.
          </p>
        ) : (
          pops.map((pop) => (
            <PopRow key={pop.popId} pop={pop} isOpen={open.has(pop.popId)} onToggle={() => toggle(pop.popId)} />
          ))
        )}
      </div>

      {tasksWithoutPop.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-bold text-foreground">
              Tarefas sem POP <span className="font-normal text-muted-foreground">({tasksWithoutPop.length})</span>
            </h3>
            <p className="text-xs text-muted-foreground">Nem toda tarefa precisa de POP — administrativas normalmente não.</p>
          </div>
          <ul className="divide-y divide-gray-50">
            {tasksWithoutPop.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{t.title}</span>
                {t.assignee && (
                  <span className="shrink-0 text-xs text-muted-foreground">{t.assignee.name}</span>
                )}
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h2 className="text-xl font-bold text-foreground">Metodologia</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Procedimentos operacionais padrão aplicados nas tarefas deste projeto.
      </p>
    </div>
  );
}

function PopRow({ pop, isOpen, onToggle }: { pop: PopUsage; isOpen: boolean; onToggle: () => void }) {
  const progress = pop.tasks.length === 0 ? 0 : Math.round((pop.doneCount / pop.tasks.length) * 100);

  return (
    <div className="border-b border-gray-50 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50"
      >
        {isOpen
          ? <ChevronDown size={14} className="shrink-0 text-primary" />
          : <ChevronRight size={14} className="shrink-0 text-muted-foreground" />}
        <FileCheck size={14} className="shrink-0 text-primary" />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{pop.title}</span>
          <span className="text-xs text-muted-foreground">
            {pop.tasks.length} {pop.tasks.length === 1 ? 'tarefa' : 'tarefas'} · {pop.doneCount} concluída{pop.doneCount === 1 ? '' : 's'}
          </span>
        </span>

        <span className="hidden w-28 shrink-0 sm:block">
          <ProgressBar value={progress} label={`Tarefas concluídas que usam ${pop.title}`} />
        </span>

        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            pop.versions.length > 1
              ? 'bg-destructive/10 text-destructive'
              : 'bg-success/20 text-primary-dark',
          )}
          title={pop.versions.length > 1 ? 'Em uso em mais de uma versão' : undefined}
        >
          {pop.versions.map((v) => `v${v}`).join(' · ')}
        </span>
      </button>

      {isOpen && (
        <ul className="divide-y divide-gray-50 bg-gray-50/60">
          {pop.tasks.map((t) => (
            <li key={`${t.taskId}-${t.versionNumber}`} className="flex items-center gap-3 py-2 pl-14 pr-5">
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{t.taskTitle}</span>
              {t.assigneeName && (
                <span className="shrink-0 text-xs text-muted-foreground">{t.assigneeName}</span>
              )}
              {pop.versions.length > 1 && (
                <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">v{t.versionNumber}</span>
              )}
              <StatusBadge status={t.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
