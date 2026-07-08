import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { UpdateInteractionUseCase } from './update-interaction.use-case';
import { IInteractionRepository } from '../domain/interaction.repository';

function makeRepo(overrides: Partial<IInteractionRepository> = {}) {
  return {
    findAuthorId: vi.fn().mockResolvedValue('author-1'),
    update: vi.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
    ...overrides,
  } as unknown as IInteractionRepository;
}

describe('UpdateInteractionUseCase', () => {
  let repo: IInteractionRepository;
  let useCase: UpdateInteractionUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new UpdateInteractionUseCase(repo);
  });

  it('allows the author to edit their own interaction', async () => {
    await useCase.execute('i1', { subject: 'novo' }, { id: 'author-1', role: SystemRole.ADMIN });
    expect(repo.update).toHaveBeenCalledWith('i1', { subject: 'novo' });
  });

  it('allows ADMIN to edit interactions from other authors', async () => {
    await useCase.execute('i1', { subject: 'novo' }, { id: 'someone-else', role: SystemRole.ADMIN });
    expect(repo.update).toHaveBeenCalled();
  });

  it('rejects a non-author, non-ADMIN requester', async () => {
    repo = makeRepo({ findAuthorId: vi.fn().mockResolvedValue('author-1') });
    useCase = new UpdateInteractionUseCase(repo);
    await expect(
      useCase.execute('i1', { subject: 'novo' }, { id: 'intruder', role: SystemRole.APROVA }),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the interaction does not exist', async () => {
    repo = makeRepo({ findAuthorId: vi.fn().mockResolvedValue(undefined) });
    useCase = new UpdateInteractionUseCase(repo);
    await expect(
      useCase.execute('missing', {}, { id: 'anyone', role: SystemRole.ADMIN }),
    ).rejects.toThrow(NotFoundException);
  });
});
