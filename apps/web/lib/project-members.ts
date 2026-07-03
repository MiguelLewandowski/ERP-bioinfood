import type { ProjectDto } from '@bioinfood/shared';

export interface ProjectMember {
  id: string;
  name: string;
}

/** Responsáveis possíveis de um projeto: criador + usuários com acesso. */
export function extractMembers(project: Pick<ProjectDto, 'createdBy' | 'accesses'> | null): ProjectMember[] {
  const map = new Map<string, ProjectMember>();
  if (project?.createdBy) map.set(project.createdBy.id, project.createdBy);
  for (const a of project?.accesses ?? []) map.set(a.user.id, a.user);
  return Array.from(map.values());
}
