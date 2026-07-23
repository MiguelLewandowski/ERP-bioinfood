import { ProjectWithRelations } from '../domain/project.entity';
import { computeForecastEnd } from '../domain/project.rules';

export interface ProjectResponseDto {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  // Término dinâmico: maior prazo (dueDate) entre as atividades. Calculado, não persistido.
  forecastEndDate: string | null;
  baselineSetAt: string | null;
  baselineSetBy: { id: string; name: string } | null;
  client: { id: string; legalName: string; tradeName: string | null } | null;
  objective: string | null;
  createdBy: { id: string; name: string };
  accesses: Array<{ user: { id: string; name: string } }>;
  /** Equipe declarada no TAP — quem trabalha no projeto sem depender de ProjectAccess. */
  team: Array<{ id: string; name: string }>;
  createdAt: string;
}

export function toProjectDto(p: ProjectWithRelations): ProjectResponseDto {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    forecastEndDate: computeForecastEnd(p.tasks)?.toISOString() ?? null,
    baselineSetAt: p.baselineSetAt?.toISOString() ?? null,
    baselineSetBy: p.baselineSetBy,
    client: p.client,
    objective: p.objective,
    createdBy: p.createdBy,
    accesses: p.accesses.map((a) => ({ user: a.user })),
    team: p.charter?.team.map((t) => t.user) ?? [],
    createdAt: p.createdAt.toISOString(),
  };
}
