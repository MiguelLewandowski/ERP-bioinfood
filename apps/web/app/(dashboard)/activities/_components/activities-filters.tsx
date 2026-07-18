'use client'; // controles de filtro (client-side)

import { useMemo } from 'react';
import { User, X } from 'lucide-react';
import type { ActivityDto, TaskStatus, TaskPriority } from '@bioinfood/shared';
import {
  STATUS_META, PRIORITY_META, distinctProjects, distinctAssignees,
  type ActivityFilters,
} from '@/lib/activities';

interface ActivitiesFiltersProps {
  activities: ActivityDto[]; // conjunto do período (para derivar opções)
  filters: ActivityFilters;
  onChange: (patch: Partial<ActivityFilters>) => void;
  onReset: () => void;
}

const SELECT_CLASS =
  'rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-muted-foreground focus:border-ring focus:outline-none';

export function ActivitiesFilters({ activities, filters, onChange, onReset }: ActivitiesFiltersProps) {
  const projects = useMemo(() => distinctProjects(activities), [activities]);
  const assignees = useMemo(() => distinctAssignees(activities), [activities]);

  const hasActive =
    !!filters.projectId || !!filters.assigneeId || !!filters.status || !!filters.priority || filters.mine;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onChange({ mine: !filters.mine })}
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
        style={filters.mine
          ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))', color: 'white' }
          : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
      >
        <User size={13} /> Minhas atividades
      </button>

      <select
        value={filters.projectId}
        onChange={(e) => onChange({ projectId: e.target.value })}
        className={SELECT_CLASS}
        aria-label="Filtrar por projeto"
      >
        <option value="">Todos os projetos</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <select
        value={filters.assigneeId}
        onChange={(e) => onChange({ assigneeId: e.target.value })}
        className={SELECT_CLASS}
        aria-label="Filtrar por responsável"
      >
        <option value="">Todos os responsáveis</option>
        <option value="__none__">Sem responsável</option>
        {assignees.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onChange({ status: e.target.value as TaskStatus | '' })}
        className={SELECT_CLASS}
        aria-label="Filtrar por status"
      >
        <option value="">Todos os status</option>
        {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => (
          <option key={s} value={s}>{STATUS_META[s].label}</option>
        ))}
      </select>

      <select
        value={filters.priority}
        onChange={(e) => onChange({ priority: e.target.value as TaskPriority | '' })}
        className={SELECT_CLASS}
        aria-label="Filtrar por prioridade"
      >
        <option value="">Todas as prioridades</option>
        {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
          <option key={p} value={p}>{PRIORITY_META[p].label}</option>
        ))}
      </select>

      {hasActive && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-gray-100"
        >
          <X size={13} /> Limpar
        </button>
      )}
    </div>
  );
}
