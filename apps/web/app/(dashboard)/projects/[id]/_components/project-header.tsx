import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { RegisterBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { StatusBadge } from '@/components/ui/status-badge';

interface ProjectHeaderProps {
  name: string;
  status: string;
  projectId: string;
  client?: { id: string; legalName: string; tradeName: string | null } | null;
}

// O caminho "Projetos › nome › aba" agora vive no breadcrumb da topbar —
// este header registra o nome do projeto e mostra título + status + cliente.
export function ProjectHeader({ name, status, projectId, client }: ProjectHeaderProps) {
  return (
    <div className="border-b border-border bg-card px-6 pb-4 pt-5">
      <RegisterBreadcrumbLabel id={projectId} label={name} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="truncate text-xl font-bold text-foreground">{name}</h1>
        <StatusBadge status={status} />
        {client && (
          <Link
            href={`/clientes/${client.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <Building2 size={12} /> {client.tradeName ?? client.legalName}
          </Link>
        )}
      </div>
    </div>
  );
}
