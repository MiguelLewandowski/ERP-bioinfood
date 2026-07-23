import Link from 'next/link';
import { ArrowRight, Building2, FileText, Users } from 'lucide-react';
import type { ProjectDto, StakeholderDto } from '@bioinfood/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TYPE_LABELS: Record<string, string> = {
  SPONSOR: 'Patrocinador',
  OWNER: 'Responsável',
};

interface OverviewCardProps {
  project: ProjectDto;
  keyPeople: StakeholderDto[];
}

export function OverviewCard({ project, keyPeople }: OverviewCardProps) {
  const clientName = project.client?.tradeName ?? project.client?.legalName ?? null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText size={15} className="text-primary" /> Resumo
        </CardTitle>
        <Link
          href={`/projects/${project.id}/charter`}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Abrir TAP <ArrowRight size={12} />
        </Link>
      </CardHeader>
      <CardContent>
        <p className="text-xs font-medium text-muted-foreground">Objetivo</p>
        <p className="mt-0.5 text-sm text-foreground">
          {project.objective ?? project.description ?? (
            <span className="text-muted-foreground">
              Ainda não definido — preencha no Termo de Abertura.
            </span>
          )}
        </p>

        {clientName && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-foreground">
            <Building2 size={13} className="text-muted-foreground" aria-hidden="true" />
            {clientName}
          </p>
        )}

        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Users size={12} aria-hidden="true" /> Quem responde pelo projeto
          </p>
          {keyPeople.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum patrocinador ou responsável registrado.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {keyPeople.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-foreground">{s.contact.name}</span>
                  <Badge variant="outline">{TYPE_LABELS[s.type] ?? s.type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
