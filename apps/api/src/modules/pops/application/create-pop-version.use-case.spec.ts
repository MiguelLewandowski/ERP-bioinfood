import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CreatePopVersionUseCase } from './create-pop-version.use-case';
import { IPopRepository } from '../domain/pops.repository.interface';

function makeRepo(overrides: Partial<IPopRepository> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({
      id: 'pop1',
      versions: [{ id: 'v1', versionNumber: 1 }],
    }),
    createVersion: vi.fn().mockResolvedValue({ id: 'pop1', versions: [{ id: 'v2', versionNumber: 2 }] }),
    ...overrides,
  } as unknown as IPopRepository;
}

describe('CreatePopVersionUseCase', () => {
  let repo: IPopRepository;
  let useCase: CreatePopVersionUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new CreatePopVersionUseCase(repo);
  });

  it('should throw NotFoundException when the POP does not exist', async () => {
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new CreatePopVersionUseCase(repo);

    await expect(useCase.execute('missing', { createdById: 'u1' })).rejects.toThrow(NotFoundException);
    expect(repo.createVersion).not.toHaveBeenCalled();
  });

  it('should create a new version — never mutate an existing one', async () => {
    await useCase.execute('pop1', { changeNotes: 'ajuste no passo 3', createdById: 'u1' });

    expect(repo.createVersion).toHaveBeenCalledWith('pop1', { changeNotes: 'ajuste no passo 3', createdById: 'u1' });
    // Não existe (nem deveria existir) um método de "update" de versão no repo.
    expect((repo as unknown as Record<string, unknown>).updateVersion).toBeUndefined();
  });
});
