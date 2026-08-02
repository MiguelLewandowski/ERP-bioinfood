import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectDto } from '@bioinfood/shared';
import { resolveProjectPeople } from './project-people';

const listMock = vi.fn();
const sessionMock = vi.fn();

vi.mock('./api-hooks', () => ({ usersApi: { list: (...a: unknown[]) => listMock(...a) } }));
vi.mock('./auth', () => ({ getSession: () => sessionMock() }));

const PROJECT = {
  createdBy: { id: 'u-1', name: 'Miguel' },
  accesses: [{ user: { id: 'u-9', name: 'Cliente Externo' } }],
  team: [],
} as unknown as ProjectDto;

const USERS = [
  { id: 'u-1', name: 'Miguel', isActive: true },
  { id: 'u-2', name: 'Marina', isActive: true },
  { id: 'u-3', name: 'Rafael', isActive: true },
  { id: 'u-4', name: 'Desativado', isActive: false },
];

/**
 * `ProjectAccess` existe para liberar projeto a CLIENTE — usuário interno vê e
 * edita todos os projetos sem ter linha nenhuma ali. Montar o seletor de
 * responsável a partir dele deixava de fora quem não criou o projeto: na
 * prática, quase todo o time. Era o bug "nomes de ADMIN não puxam nos selects".
 */
describe('resolveProjectPeople', () => {
  beforeEach(() => {
    listMock.mockResolvedValue(USERS);
    sessionMock.mockResolvedValue({ sub: 'u-1', email: 'a@b.com', role: 'ADMIN' });
  });

  it('should offer every active user, not only those with project access', async () => {
    const people = await resolveProjectPeople(PROJECT, 'tok');

    expect(people.map((p) => p.name)).toContain('Marina');
    expect(people.map((p) => p.name)).toContain('Rafael');
  });

  it('should leave deactivated users out', async () => {
    const people = await resolveProjectPeople(PROJECT, 'tok');

    expect(people.map((p) => p.name)).not.toContain('Desativado');
  });

  // Quem já está no projeto fica, mesmo desativado depois: sem isso, salvar
  // apagaria a pessoa do registro histórico.
  it('should keep someone already on the project even if not in the active list', async () => {
    const people = await resolveProjectPeople(PROJECT, 'tok');

    expect(people.map((p) => p.id)).toContain('u-9');
  });

  it('should sort people by name', async () => {
    const people = await resolveProjectPeople(PROJECT, 'tok');

    expect(people.map((p) => p.name)).toEqual([...people.map((p) => p.name)].sort((a, b) => a.localeCompare(b)));
  });

  // GET /users exige ADMIN ou PADRAO. CLIENTE enxerga só o projeto dele.
  it('should fall back to project members for a CLIENTE', async () => {
    sessionMock.mockResolvedValue({ sub: 'u-9', email: 'c@d.com', role: 'CLIENTE' });

    const people = await resolveProjectPeople(PROJECT, 'tok');

    // Ordenado por nome: "Cliente Externo" antes de "Miguel".
    expect(people.map((p) => p.id)).toEqual(['u-9', 'u-1']);
    expect(listMock).not.toHaveBeenCalled();
  });

  // A lista de pessoas não pode derrubar a página inteira.
  it('should fall back to project members when the users call fails', async () => {
    listMock.mockRejectedValue(new Error('boom'));

    const people = await resolveProjectPeople(PROJECT, 'tok');

    expect(people.map((p) => p.id).sort()).toEqual(['u-1', 'u-9']);
  });

  it('should not break on a null project', async () => {
    const people = await resolveProjectPeople(null, 'tok');

    expect(people.map((p) => p.name)).toContain('Marina');
  });
});
