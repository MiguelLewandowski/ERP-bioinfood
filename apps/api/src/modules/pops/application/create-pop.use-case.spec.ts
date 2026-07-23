import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CreatePopUseCase } from './create-pop.use-case';
import { IPopRepository } from '../domain/pops.repository.interface';

function makeRepo(overrides: Partial<IPopRepository> = {}) {
  return {
    categoryExists: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue({
      id: 'pop1',
      title: 'Limpeza de bancada',
      versions: [{ id: 'v1', versionNumber: 1 }],
    }),
    ...overrides,
  } as unknown as IPopRepository;
}

const INPUT = {
  title: 'Limpeza de bancada',
  categoryId: 'cat1',
  createdById: 'u1',
};

describe('CreatePopUseCase', () => {
  let repo: IPopRepository;
  let useCase: CreatePopUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new CreatePopUseCase(repo);
  });

  it('should never create a POP without an initial version — delegated to the repository transaction', async () => {
    const pop = await useCase.execute(INPUT);

    expect(repo.create).toHaveBeenCalledWith(INPUT);
    expect(pop.versions).toHaveLength(1);
    expect(pop.versions[0].versionNumber).toBe(1);
  });

  // Sem esta checagem o Prisma devolveria erro cru de violação de FK.
  it('should reject a category that does not exist', async () => {
    repo = makeRepo({ categoryExists: vi.fn().mockResolvedValue(false) });
    useCase = new CreatePopUseCase(repo);

    await expect(useCase.execute(INPUT)).rejects.toThrow(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
