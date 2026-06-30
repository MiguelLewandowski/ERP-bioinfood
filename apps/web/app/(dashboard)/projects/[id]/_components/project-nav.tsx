'use client'; // needs usePathname to highlight active tab

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText, GitBranch, BarChart2, AlertTriangle,
  List, Columns, Map, Settings, CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Termo de Abertura', href: 'charter',  icon: FileText },
  { label: 'EAP / WBS',         href: 'wbs',      icon: GitBranch },
  { label: 'Gantt',             href: 'gantt',    icon: BarChart2 },
  { label: 'Riscos',            href: 'risks',    icon: AlertTriangle },
  { label: 'Backlog',           href: 'backlog',  icon: List },
  { label: 'Kanban',            href: 'kanban',   icon: Columns },
  { label: 'Atividades',       href: 'atividades', icon: CalendarDays },
  { label: 'Roadmap',           href: 'roadmap',  icon: Map },
  { label: 'Configurações',     href: 'settings', icon: Settings },
];

interface ProjectNavProps {
  projectId: string;
}

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 px-6">
      <ul className="flex gap-1 overflow-x-auto scrollbar-none" role="tablist">
        {TABS.map(({ label, href, icon: Icon }) => {
          const fullHref = `/projects/${projectId}/${href}`;
          const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);

          return (
            <li key={href} role="presentation">
              <Link
                href={fullHref}
                role="tab"
                aria-selected={isActive}
                className={cn(
                  'flex items-center gap-2 px-3 py-3.5 text-sm font-medium whitespace-nowrap',
                  'border-b-2 transition-colors duration-150 focus-visible:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-[#52B552] focus-visible:ring-offset-1',
                  isActive
                    ? 'border-[#147F23] text-[#147F23]'
                    : 'border-transparent text-[#575756] hover:text-[#1D1D1B] hover:border-gray-300',
                )}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
