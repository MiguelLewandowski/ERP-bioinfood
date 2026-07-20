import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DeletePopUseCase } from './delete-pop.use-case';
import { IPopRepository } from '../domain/pops.repository.interface';

function makeRepo(overrides: Partial<IPopRepository> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'pop1' }),
    softDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IPopRepository;
}

describe('DeletePopUseCase', () => {
  let repo: IPopRepository;
  let useCase: DeletePopUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new DeletePopUseCase(repo);
  });

  it('should throw NotFoundException when the POP does not exist', async () => {
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new DeletePopUseCase(repo);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('should soft-delete the POP, preserving history', async () => {
    await useCase.execute('pop1');
    expect(repo.softDelete).toHaveBeenCalledWith('pop1');
  });
});
