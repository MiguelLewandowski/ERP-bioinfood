'use client'; // expande/recolhe a lista de tarefas de cada POP

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  FileCheck, ChevronRight, ChevronDown, AlertTriangle, FlaskConical, ListChecks, Search, Loader2,
} from 'lucide-react';
import type { TaskDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { ProjectMethodology, PopUsage } from '@/lib/project-pops';
import { popsWithVersionDrift } from '@/lib/project-pops';

interface Props {
  projectId: string;
  methodology: ProjectMethodology;
}

const UNASSIGNED = 'Sem responsável';

interface AssigneeGroup {
  name: string;
  tasks: TaskDto[];
}

/**
 * Agrupa por responsável e aplica a busca. A lista chegava a 44 linhas planas
 * sem dono visível — agrupar responde "quem tem trabalho sem procedimento", que
 * é a pergunta que a tela existe para responder.
 *
 * A busca casa título OU responsável: procurar por uma pessoa devolve o balde
 * dela inteiro.
 */
function groupByAssignee(tasks: TaskDto[], query: string): AssigneeGroup[] {
  const q = query.trim().toLowerCase();
  const map = new Map<string, AssigneeGroup>();

  for (const task of tasks) {
    const name = task.assignee?.name ?? UNASSIGNED;
    if (q && !task.title.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) continue;
    const group = map.get(name) ?? { name, tasks: [] };
    group.tasks.push(task);
    map.set(name, group);
  }

  // "Sem responsável" por último: é o balde que não é pessoa, e deixá-lo no meio
  // da ordem alfabética esconde justamente o caso que precisa de ação.
  return [...map.values()].sort((a, b) => (
    a.name === UNASSIGNED ? 1
      : b.name === UNASSIGNED ? -1
        : a.name.localeCompare(b.name)
  ));
}

export function MethodologyClient({ projectId, methodology }: Props) {
  const { pops, tasksWithoutPop, totalTasks, tasksWithPop, coverage, notApplicable } = methodology;
  const { token, session } = useAuth();
  const router = useRouter();
  // Mesma regra do Gantt: CLIENTE lê o método do projeto, não reclassifica tarefa.
  const canClassify = session.role === 'ADMIN' || session.role === 'PADRAO';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  // Fechada por padrão: 44 linhas abertas empurravam as POPs — o conteúdo
  // principal da tela — para fora da primeira dobra.
  const [listOpen, setListOpen] = useState(false);
  const [query, setQuery] = useState('');
  const drift = popsWithVersionDrift(pops);

  const groups = useMemo(() => groupByAssignee(tasksWithoutPop, query), [tasksWithoutPop, query]);

  function toggleSelected(taskId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }

  // A classificação acontece AQUI, onde a métrica dói — e não escondida no
  // formulário da tarefa, que ninguém abre para arrumar denominador.
  async function markNotApplicable() {
    setMarking(true);
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => (
        api.patch(`/projects/${projectId}/tasks/${id}`, { requiresSOP: false }, token)
      )));
      toast.success(
        ids.length === 1
          ? 'Tarefa marcada como não aplicável.'
          : `${ids.length} tarefas marcadas como não aplicáveis.`,
      );
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMarking(false);
    }
  }

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
          hint={
            notApplicable > 0
              ? `${tasksWithPop} de ${totalTasks} · ${notApplicable} não aplicável(is)`
              : `${tasksWithPop} de ${totalTasks} tarefas`
          }
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
          <button
            onClick={() => setListOpen((v) => !v)}
            aria-expanded={listOpen}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50"
          >
            {listOpen
              ? <ChevronDown size={14} className="shrink-0 text-primary" />
              : <ChevronRight size={14} className="shrink-0 text-muted-foreground" />}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">
                Tarefas sem POP <span className="font-normal text-muted-foreground">({tasksWithoutPop.length})</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Nem toda tarefa precisa de POP — administrativas normalmente não.
              </span>
            </span>
          </button>

          {listOpen && (
            <div className="border-t border-gray-100">
              <div className="relative px-5 py-3">
                <Search size={13} className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Buscar tarefas sem POP"
                  placeholder="Buscar por tarefa ou responsável…"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
              </div>

              {selected.size > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-y border-primary/20 bg-primary/5 px-5 py-2.5">
                  <span className="text-xs font-medium text-foreground">
                    {selected.size} {selected.size === 1 ? 'tarefa selecionada' : 'tarefas selecionadas'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelected(new Set())}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white"
                    >
                      Limpar
                    </button>
                    <button
                      onClick={markNotApplicable}
                      disabled={marking}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                    >
                      {marking && <Loader2 size={12} className="animate-spin" />}
                      Não exige POP
                    </button>
                  </div>
                </div>
              )}

              {groups.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma tarefa sem POP corresponde à busca.
                </p>
              ) : (
                groups.map((group) => (
                  <div key={group.name}>
                    <p className="border-y border-gray-100 bg-gray-50 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.name} <span className="font-normal">({group.tasks.length})</span>
                    </p>
                    <ul className="divide-y divide-gray-50">
                      {group.tasks.map((t) => (
                        <li key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                          {canClassify && (
                            <input
                              type="checkbox"
                              checked={selected.has(t.id)}
                              onChange={() => toggleSelected(t.id)}
                              aria-label={`Selecionar ${t.title}`}
                              className="h-4 w-4 shrink-0 rounded border-gray-300 accent-[hsl(var(--primary))]"
                            />
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{t.title}</span>
                          <StatusBadge status={t.status} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}
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
          {/* Só quantas tarefas usam a POP. Progresso saiu daqui de propósito:
              esta seção responde "quais procedimentos este projeto segue", não
              "quanto do trabalho está pronto" — para isso existe o Dashboard.
              A barra competia com o título e não era a pergunta da tela. */}
          <span className="text-xs text-muted-foreground">
            {pop.tasks.length} {pop.tasks.length === 1 ? 'tarefa' : 'tarefas'}
          </span>
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
