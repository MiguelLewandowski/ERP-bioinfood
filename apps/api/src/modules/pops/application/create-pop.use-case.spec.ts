import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePopUseCase } from './create-pop.use-case';
import { IPopRepository } from '../domain/pops.repository.interface';

function makeRepo(overrides: Partial<IPopRepository> = {}) {
  return {
    create: vi.fn().mockResolvedValue({
      id: 'pop1',
      title: 'Limpeza de bancada',
      versions: [{ id: 'v1', versionNumber: 1 }],
    }),
    ...overrides,
  } as unknown as IPopRepository;
}

describe('CreatePopUseCase', () => {
  let repo: IPopRepository;
  let useCase: CreatePopUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new CreatePopUseCase(repo);
  });

  it('should never create a POP without an initial version — delegated to the repository transaction', async () => {
    const pop = await useCase.execute({
      title: 'Limpeza de bancada',
      createdById: 'u1',
    });

    expect(repo.create).toHaveBeenCalledWith({
      title: 'Limpeza de bancada',
      createdById: 'u1',
    });
    expect(pop.versions).toHaveLength(1);
    expect(pop.versions[0].versionNumber).toBe(1);
  });
});
