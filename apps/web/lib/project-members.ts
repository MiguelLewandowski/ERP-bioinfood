import type { ProjectDto } from '@bioinfood/shared';

export interface ProjectMember {
  id: string;
  name: string;
}

/**
 * Responsáveis possíveis de um projeto: criador + equipe do TAP + quem tem
 * ProjectAccess.
 *
 * A equipe do TAP entra porque `ProjectAccess` existe para liberar projeto a
 * CLIENTE — usuário interno enxerga tudo sem ela. Sem a equipe, o seletor de
 * responsável só oferecia quem criou o projeto (na prática, o admin).
 */
export function extractMembers(
  project: Pick<ProjectDto, 'createdBy' | 'accesses' | 'team'> | null,
): ProjectMember[] {
  const map = new Map<string, ProjectMember>();
  if (project?.createdBy) map.set(project.createdBy.id, project.createdBy);
  for (const m of project?.team ?? []) map.set(m.id, m);
  for (const a of project?.accesses ?? []) map.set(a.user.id, a.user);
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
