import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PLANNING:    { label: 'Planejamento',  bg: '#FDC75F', text: '#C16C06' },
  IN_PROGRESS: { label: 'Em andamento', bg: '#86C175', text: '#156D1D' },
  ON_HOLD:     { label: 'Pausado',       bg: '#3C3C3B', text: '#878787' },
  COMPLETED:   { label: 'Concluído',     bg: '#147F23', text: '#FFFFFF' },
  CANCELLED:   { label: 'Cancelado',     bg: '#303030', text: '#706F6F' },
};

interface ProjectHeaderProps {
  name: string;
  status: string;
  projectId: string;
}

export function ProjectHeader({ name, status, projectId }: ProjectHeaderProps) {
  const badge = STATUS_CONFIG[status] ?? STATUS_CONFIG.PLANNING;

  return (
    <div className="px-6 pt-5 pb-4 border-b border-gray-200 bg-white">
      <nav className="flex items-center gap-1.5 text-xs text-[#706F6F] mb-2">
        <Link href="/projects" className="hover:text-[#147F23] transition-colors">
          Projetos
        </Link>
        <ChevronRight size={12} />
        <span className="text-[#1D1D1B] font-medium truncate max-w-[240px]">{name}</span>
      </nav>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-[#1D1D1B] truncate">{name}</h1>
        <span
          className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: badge.bg, color: badge.text }}
        >
          {badge.label}
        </span>
      </div>
    </div>
  );
}
