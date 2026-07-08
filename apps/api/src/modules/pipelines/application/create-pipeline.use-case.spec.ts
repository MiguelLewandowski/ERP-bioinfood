import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { StageType } from '@prisma/client';
import { CreatePipelineUseCase } from './create-pipeline.use-case';
import { IPipelineRepository } from '../domain/pipeline.repository';

function makeRepo(overrides: Partial<IPipelineRepository> = {}) {
  return {
    countPipelines: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'p1', isDefault: data.isDefault, stages: [] })),
    clearDefaultExcept: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IPipelineRepository;
}

describe('CreatePipelineUseCase', () => {
  let repo: IPipelineRepository;
  let useCase: CreatePipelineUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new CreatePipelineUseCase(repo);
  });

  it('should reject a pipeline whose provided stages have no OPEN stage', async () => {
    await expect(
      useCase.execute({ name: 'X', stages: [{ name: 'Ganho', type: StageType.WON }] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should force the first pipeline to be the default', async () => {
    repo = makeRepo({ countPipelines: vi.fn().mockResolvedValue(0) });
    useCase = new CreatePipelineUseCase(repo);

    await useCase.execute({ name: 'First' });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ isDefault: true }));
  });

  it('should demote other defaults when creating a default pipeline', async () => {
    repo = makeRepo({
      create: vi.fn().mockResolvedValue({ id: 'p2', isDefault: true, stages: [] }),
    });
    useCase = new CreatePipelineUseCase(repo);

    await useCase.execute({ name: 'New default', isDefault: true });

    expect(repo.clearDefaultExcept).toHaveBeenCalledWith('p2');
  });
});
