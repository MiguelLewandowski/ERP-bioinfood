import { describe, it, expect } from 'vitest';
import type { ProjectDto } from '@bioinfood/shared';
import { extractMembers } from './project-members';

function makeProject(overrides: Partial<ProjectDto> = {}): ProjectDto {
  return {
    createdBy: { id: 'user-1', name: 'Miguel' },
    accesses: [],
    team: [],
    ...overrides,
  } as unknown as ProjectDto;
}

describe('extractMembers', () => {
  // O caso que quebrava: ProjectAccess existe para liberar projeto a CLIENTE,
  // então o time interno não tem acesso concedido e sobrava só o criador.
  it('should offer the charter team even without any project access', () => {
    const members = extractMembers(makeProject({
      team: [{ id: 'user-3', name: 'Rafael' }, { id: 'user-4', name: 'Thiago' }],
    }));

    expect(members.map((m) => m.name)).toEqual(['Miguel', 'Rafael', 'Thiago']);
  });

  it('should merge creator, charter team and granted access without duplicates', () => {
    const members = extractMembers(makeProject({
      team: [{ id: 'user-1', name: 'Miguel' }, { id: 'user-3', name: 'Rafael' }],
      accesses: [{ user: { id: 'user-3', name: 'Rafael' } }, { user: { id: 'user-2', name: 'Marina' } }],
    }));

    expect(members).toHaveLength(3);
    expect(members.map((m) => m.id).sort()).toEqual(['user-1', 'user-2', 'user-3']);
  });

  it('should sort members by name so the picker is scannable', () => {
    const members = extractMembers(makeProject({
      team: [{ id: 'user-4', name: 'Thiago' }, { id: 'user-2', name: 'Camila' }],
    }));

    expect(members.map((m) => m.name)).toEqual(['Camila', 'Miguel', 'Thiago']);
  });

  it('should return an empty list for a null project', () => {
    expect(extractMembers(null)).toEqual([]);
  });

  // Projeto antigo, criado antes de o TAP existir: não pode quebrar o seletor.
  it('should tolerate a project without a charter team', () => {
    const members = extractMembers({
      createdBy: { id: 'user-1', name: 'Miguel' },
      accesses: [],
    } as unknown as ProjectDto);

    expect(members).toEqual([{ id: 'user-1', name: 'Miguel' }]);
  });
});
