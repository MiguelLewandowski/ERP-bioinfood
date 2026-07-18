'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useBreadcrumbLabels } from './breadcrumb-context';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projetos',
  activities: 'Atividades',
  clientes: 'Parceiros de Negócio',
  crm: 'CRM',
  users: 'Usuários',
  settings: 'Configurações',
  config: 'Configuração',
  charter: 'TAP',
  kanban: 'Kanban',
  gantt: 'Gantt',
  backlog: 'Backlog',
  risks: 'Riscos',
  wbs: 'EAP',
  roadmap: 'Roadmap',
  stakeholders: 'Stakeholders',
  contatos: 'Contatos',
  negocios: 'Negócios',
  produtos: 'Produtos',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const entityLabels = useBreadcrumbLabels();

  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments
    .map((seg, i) => ({
      label: SEGMENT_LABELS[seg] ?? entityLabels[seg] ?? null,
      href: '/' + segments.slice(0, i + 1).join('/'),
    }))
    .filter((c): c is { label: string; href: string } => c.label !== null);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} className="shrink-0 text-muted-foreground" />}
            {isLast ? (
              <span className="max-w-[240px] truncate font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="max-w-[200px] truncate text-muted-foreground transition-colors hover:text-primary"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
