import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ManageNotesUseCase } from './manage-notes.use-case';
import { INotesRepository } from '../domain/notes.repository.interface';
import { NoteEntity } from '../domain/note.entity';

const OWNER = 'user-bruna';
const OTHER = 'user-luana';
const ADMIN = 'user-admin';

function makeNote(overrides: Partial<NoteEntity> = {}): NoteEntity {
  return {
    id: 'note-1',
    ownerId: OWNER,
    title: 'Ideias de bioprocesso',
    contentHtml: '<p>segredo</p>',
    pinned: false,
    createdAt: new Date('2026-07-30T12:00:00Z'),
    updatedAt: new Date('2026-07-30T12:00:00Z'),
    ...overrides,
  };
}

/**
 * Repositório em memória que reproduz a regra que importa: `ownerId` faz parte
 * do filtro, sempre. Quem não é dono não encontra a nota — é o que o
 * repositório Prisma real faz com `where: { id, ownerId }`.
 */
function makeRepo(notes: NoteEntity[]): INotesRepository {
  return {
    findAllByOwner: vi.fn(async (ownerId: string) => notes.filter((n) => n.ownerId === ownerId)),
    findByIdForOwner: vi.fn(
      async (ownerId: string, id: string) =>
        notes.find((n) => n.id === id && n.ownerId === ownerId) ?? null,
    ),
    create: vi.fn(async (ownerId: string, data) => makeNote({ ownerId, ...data })),
    update: vi.fn(async (ownerId: string, id: string, data) => {
      const found = notes.find((n) => n.id === id && n.ownerId === ownerId);
      return found ? { ...found, ...data } : null;
    }),
    softDelete: vi.fn(
      async (ownerId: string, id: string) =>
        notes.some((n) => n.id === id && n.ownerId === ownerId),
    ),
  };
}

describe('ManageNotesUseCase — privacidade', () => {
  let repo: INotesRepository;
  let useCase: ManageNotesUseCase;

  beforeEach(() => {
    repo = makeRepo([makeNote()]);
    useCase = new ManageNotesUseCase(repo);
  });

  it('should return the note when the owner asks for it', async () => {
    const note = await useCase.get(OWNER, 'note-1');

    expect(note.contentHtml).toBe('<p>segredo</p>');
  });

  it('should hide the note when another user asks for it', async () => {
    await expect(useCase.get(OTHER, 'note-1')).rejects.toThrow(NotFoundException);
  });

  /**
   * O teste que documenta a exceção do CLAUDE.md: em todo o resto do ERP o
   * ADMIN atravessa o RolesGuard. Aqui não há o que atravessar — ele passa o
   * próprio id e a nota de outra pessoa simplesmente não existe para ele.
   */
  it('should hide the note from ADMIN when the note belongs to someone else', async () => {
    await expect(useCase.get(ADMIN, 'note-1')).rejects.toThrow(NotFoundException);
  });

  it('should not leak existence when a stranger reads a real note', async () => {
    // 404 e não 403: um 403 confirmaria que a nota existe e é de outro.
    await expect(useCase.get(OTHER, 'note-1')).rejects.toThrow('Anotação não encontrada');
    await expect(useCase.get(OTHER, 'nao-existe')).rejects.toThrow('Anotação não encontrada');
  });

  it('should list only the notes of the requesting user when several owners exist', async () => {
    repo = makeRepo([makeNote(), makeNote({ id: 'note-2', ownerId: OTHER })]);
    useCase = new ManageNotesUseCase(repo);

    const mine = await useCase.list(OWNER);

    expect(mine).toHaveLength(1);
    expect(mine[0].id).toBe('note-1');
  });

  it('should refuse to update a note owned by someone else', async () => {
    await expect(useCase.update(OTHER, 'note-1', { title: 'invadida' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should refuse to delete a note owned by someone else', async () => {
    await expect(useCase.remove(ADMIN, 'note-1')).rejects.toThrow(NotFoundException);
  });

  it('should always pass the caller id as owner when creating', async () => {
    await useCase.create(OWNER, { title: 'nova' });

    expect(repo.create).toHaveBeenCalledWith(OWNER, expect.objectContaining({ title: 'nova' }));
  });
});

describe('ManageNotesUseCase — sanitização', () => {
  it('should strip scripts from content when saving', async () => {
    const repo = makeRepo([]);
    const useCase = new ManageNotesUseCase(repo);

    await useCase.create(OWNER, { contentHtml: '<p>ok</p><script>alert(1)</script>' });

    expect(repo.create).toHaveBeenCalledWith(OWNER, expect.objectContaining({
      contentHtml: '<p>ok</p>',
    }));
  });

  it('should trim the title when it has surrounding spaces', async () => {
    const repo = makeRepo([]);
    const useCase = new ManageNotesUseCase(repo);

    await useCase.create(OWNER, { title: '  Reunião  ' });

    expect(repo.create).toHaveBeenCalledWith(OWNER, expect.objectContaining({ title: 'Reunião' }));
  });

  it('should not touch content when the field was not sent', async () => {
    const repo = makeRepo([makeNote()]);
    const useCase = new ManageNotesUseCase(repo);

    await useCase.update(OWNER, 'note-1', { pinned: true });

    expect(repo.update).toHaveBeenCalledWith(OWNER, 'note-1', { pinned: true });
  });
});
