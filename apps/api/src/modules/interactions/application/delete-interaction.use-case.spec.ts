import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { DeleteInteractionUseCase } from './delete-interaction.use-case';
import { IInteractionRepository } from '../domain/interaction.repository';

function makeRepo(overrides: Partial<IInteractionRepository> = {}) {
  return {
    findAuthorId: vi.fn().mockResolvedValue('author-1'),
    softDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IInteractionRepository;
}

describe('DeleteInteractionUseCase', () => {
  let repo: IInteractionRepository;
  let useCase: DeleteInteractionUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new DeleteInteractionUseCase(repo);
  });

  it('allows the author to soft-delete their own interaction', async () => {
    await useCase.execute('i1', { id: 'author-1', role: SystemRole.PADRAO });
    expect(repo.softDelete).toHaveBeenCalledWith('i1');
  });

  it('rejects a non-author, non-ADMIN requester', async () => {
    await expect(
      useCase.execute('i1', { id: 'intruder', role: SystemRole.PADRAO }),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the interaction does not exist', async () => {
    repo = makeRepo({ findAuthorId: vi.fn().mockResolvedValue(undefined) });
    useCase = new DeleteInteractionUseCase(repo);
    await expect(
      useCase.execute('missing', { id: 'anyone', role: SystemRole.ADMIN }),
    ).rejects.toThrow(NotFoundException);
  });
});
