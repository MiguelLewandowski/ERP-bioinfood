'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useBreadcrumbLabels } from './breadcrumb-context';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projetos',
  activities: 'Atividades',
  anotacoes: 'Anotações',
  estoque: 'Estoque',
  crm: 'CRM',
  empresas: 'Empresas',
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
    .map((seg, i) => {
      const path = '/' + segments.slice(0, i + 1).join('/');
      return {
        label: SEGMENT_LABELS[seg] ?? entityLabels[seg] ?? null,
        // "Empresas" não é uma rota própria — é a aba `empresas` de /crm.
        // /crm/empresas (sem [id]) 404: a lista mora em /crm?tab=empresas.
        href: path === '/crm/empresas' ? '/crm?tab=empresas' : path,
      };
    })
    .filter((c): c is { label: string; href: string } => c.label !== null);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} className="shrink-0 text-muted-foreground" />}
            {/* `title` em todos: o rótulo é truncado por CSS, e nome de projeto
                passa de 240px com frequência — sem isso não há como ler o nome
                inteiro em lugar nenhum da tela. */}
            {isLast ? (
              <span title={crumb.label} className="max-w-[240px] truncate font-medium text-foreground">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                title={crumb.label}
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
