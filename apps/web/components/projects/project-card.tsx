'use client';

import Link from 'next/link';
import { MoreVertical } from 'lucide-react';

interface ProjectCardProps {
  project: any;
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em andamento',
  ON_HOLD: 'Pausado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  return (
    <Link href={`/projects/${project.id}`} className="block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-[#86C175] transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABELS[project.status] ?? project.status}
        </span>
        <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <MoreVertical size={16} />
        </button>
      </div>

      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
        {project.name}
      </h3>
      {project.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{project.description}</p>
      )}

      <div className="text-xs text-gray-400 space-y-1 mb-3">
        <div className="flex justify-between">
          <span>Início</span>
          <span>{fmt(project.startDate)}</span>
        </div>
        {project.endDate && (
          <div className="flex justify-between">
            <span>Término (planejado)</span>
            <span>{fmt(project.endDate)}</span>
          </div>
        )}
        {project.forecastEndDate && (
          <div className="flex justify-between">
            <span>Término (estimado)</span>
            <span className="font-medium text-[#147F23]">{fmt(project.forecastEndDate)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex -space-x-1">
          {project.accesses?.slice(0, 4).map((a: any) => (
            <div
              key={a.user.id}
              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: '#147F23' }}
              title={a.user.name}
            >
              {a.user.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <span className="text-xs text-gray-400">{project.createdBy?.name}</span>
      </div>
    </Link>
  );
}
