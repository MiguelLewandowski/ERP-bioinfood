'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import type { ProjectDto, ProjectStatus } from '@bioinfood/shared';
import { PROJECT_STATUS_LABELS } from '@/lib/project-report';

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
};

interface ProjectsTableProps {
  projects: ProjectDto[];
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const selectCls =
  'text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:border-[#52B552] focus:outline-none text-[#575756]';

export default function ProjectsTable({ projects }: ProjectsTableProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [clientId, setClientId] = useState('');
  const [ownerId, setOwnerId] = useState('');

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      if (p.client) map.set(p.client.id, p.client.tradeName ?? p.client.legalName);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [projects]);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      if (p.createdBy) map.set(p.createdBy.id, p.createdBy.name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (status && p.status !== status) return false;
      if (clientId && p.client?.id !== clientId) return false;
      if (ownerId && p.createdBy?.id !== ownerId) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, search, status, clientId, ownerId]);

  const hasFilters = search !== '' || status !== '' || clientId !== '' || ownerId !== '';

  function clearFilters() {
    setSearch('');
    setStatus('');
    setClientId('');
    setOwnerId('');
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#878787]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar projeto…"
            className="w-48 pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | '')} className={selectCls}>
          <option value="">Todos os status</option>
          {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
            <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
          ))}
        </select>
        {clients.length > 0 && (
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectCls}>
            <option value="">Todos os clientes</option>
            {clients.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        )}
        {owners.length > 0 && (
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={selectCls}>
            <option value="">Todos os responsáveis</option>
            {owners.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        )}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#878787] hover:text-[#575756]"
          >
            <X size={13} /> Limpar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-[#878787]">
          Nenhum projeto encontrado para os filtros aplicados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] font-semibold uppercase tracking-wide text-[#878787]">
                <th className="px-4 py-3">Projeto</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Término (plan.)</th>
                <th className="px-4 py-3">Término (est.)</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3 text-center">Membros</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium text-[#1D1D1B] hover:text-[#147F23]"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#575756] whitespace-nowrap">{project.client?.tradeName ?? project.client?.legalName ?? '—'}</td>
                  <td className="px-4 py-3 text-[#575756] whitespace-nowrap">{fmt(project.startDate)}</td>
                  <td className="px-4 py-3 text-[#575756] whitespace-nowrap">{fmt(project.endDate)}</td>
                  <td className="px-4 py-3 font-medium text-[#147F23] whitespace-nowrap">{fmt(project.forecastEndDate)}</td>
                  <td className="px-4 py-3 text-[#575756] whitespace-nowrap">{project.createdBy?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-[#575756]">{project.accesses?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-xs text-[#878787]">
        {filtered.length} de {projects.length} projeto{projects.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}
