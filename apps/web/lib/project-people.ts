import type { ProjectDto } from '@bioinfood/shared';
import { usersApi } from './api-hooks';
import { getSession } from './auth';
import { extractMembers, type ProjectMember } from './project-members';

/**
 * Quem pode ser escolhido como responsável dentro de um projeto.
 *
 * **Por que não é `extractMembers` sozinho:** aquele monta a lista com
 * `createdBy` + equipe do TAP + `ProjectAccess`. Mas `ProjectAccess` existe para
 * liberar projeto a CLIENTE — usuário interno (ADMIN/PADRAO) enxerga e edita
 * todos os projetos **sem** ter linha nenhuma ali. Resultado: quem não criou o
 * projeto e não estava na equipe do TAP simplesmente não aparecia nos seletores
 * de responsável de tarefa, risco e pacote da EAP.
 *
 * É a mesma falha que o seletor de equipe do TAP já tinha e que foi corrigida em
 * `2956e85`; o conserto não tinha chegado às outras telas.
 *
 * `GET /users` exige ADMIN ou PADRAO — CLIENTE cai nos membros do projeto, que é
 * exatamente o que ele deve enxergar.
 *
 * Quem já está no projeto entra mesmo se tiver sido desativado depois: sem isso,
 * salvar apagaria a pessoa do registro histórico.
 */
export async function resolveProjectPeople(
  project: Pick<ProjectDto, 'createdBy' | 'accesses' | 'team'> | null,
  token: string,
): Promise<ProjectMember[]> {
  const members = extractMembers(project);

  const session = await getSession();
  const canListUsers = session?.role === 'ADMIN' || session?.role === 'PADRAO';
  if (!canListUsers) return members;

  try {
    const users = await usersApi.list(token);
    const map = new Map<string, ProjectMember>();
    for (const u of users) {
      if (u.isActive) map.set(u.id, { id: u.id, name: u.name });
    }
    for (const m of members) if (!map.has(m.id)) map.set(m.id, m);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // A lista de pessoas não pode derrubar a página: sem ela o seletor volta ao
    // comportamento antigo, que é limitado mas funciona.
    return members;
  }
}
