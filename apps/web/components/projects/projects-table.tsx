'use client';

import Link from 'next/link';
import type { ProjectDto } from '@bioinfood/shared';
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

export default function ProjectsTable({ projects }: ProjectsTableProps) {
  return (
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
          {projects.map((project) => (
            <tr key={project.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium text-[#1D1D1B] hover:text-[#147F23]"
                >
                  {project.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                </span>
              </td>
              <td className="px-4 py-3 text-[#575756]">{project.clientName ?? '—'}</td>
              <td className="px-4 py-3 text-[#575756]">{fmt(project.startDate)}</td>
              <td className="px-4 py-3 text-[#575756]">{fmt(project.endDate)}</td>
              <td className="px-4 py-3 font-medium text-[#147F23]">{fmt(project.forecastEndDate)}</td>
              <td className="px-4 py-3 text-[#575756]">{project.createdBy?.name ?? '—'}</td>
              <td className="px-4 py-3 text-center text-[#575756]">{project.accesses?.length ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
