import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GetPopUseCase } from './get-pop.use-case';
import { IPopRepository } from '../domain/pops.repository.interface';

function makeRepo(overrides: Partial<IPopRepository> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'pop1' }),
    ...overrides,
  } as unknown as IPopRepository;
}

describe('GetPopUseCase', () => {
  let repo: IPopRepository;
  let useCase: GetPopUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new GetPopUseCase(repo);
  });

  it('should throw NotFoundException when the POP does not exist', async () => {
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new GetPopUseCase(repo);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
  });

  it('should return the POP (global catalog, no project scoping)', async () => {
    const pop = await useCase.execute('pop1');
    expect(pop).toEqual({ id: 'pop1' });
  });
});
