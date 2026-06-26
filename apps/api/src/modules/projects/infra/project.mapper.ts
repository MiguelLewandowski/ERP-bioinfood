import { ProjectWithRelations } from '../domain/project.entity';

export interface ProjectResponseDto {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  clientName: string | null;
  objective: string | null;
  sponsor: string | null;
  createdBy: { id: string; name: string };
  accesses: Array<{ user: { id: string; name: string } }>;
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
    clientName: p.clientName,
    objective: p.objective,
    sponsor: p.sponsor,
    createdBy: p.createdBy,
    accesses: p.accesses.map((a) => ({ user: a.user })),
    createdAt: p.createdAt.toISOString(),
  };
}
