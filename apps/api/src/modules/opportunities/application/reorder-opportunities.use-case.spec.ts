import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { StageType } from '@prisma/client';
import { ReorderOpportunitiesUseCase } from './reorder-opportunities.use-case';
import { IOpportunityRepository } from '../domain/opportunity.repository';

function makeRepo(overrides: Partial<IOpportunityRepository> = {}) {
  return {
    findStageRef: vi.fn().mockResolvedValue({ id: 's1', pipelineId: 'p1', type: StageType.OPEN, probability: 10 }),
    reorder: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IOpportunityRepository;
}

describe('ReorderOpportunitiesUseCase', () => {
  let repo: IOpportunityRepository;
  let useCase: ReorderOpportunitiesUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new ReorderOpportunitiesUseCase(repo);
  });

  it('should reject reordering into a stage that does not exist', async () => {
    repo = makeRepo({ findStageRef: vi.fn().mockResolvedValue(null) });
    useCase = new ReorderOpportunitiesUseCase(repo);

    await expect(useCase.execute('missing-stage', [{ id: 'o1', order: 0 }])).rejects.toThrow(NotFoundException);
    expect(repo.reorder).not.toHaveBeenCalled();
  });

  it('should scope the reorder call by stageId', async () => {
    const items = [{ id: 'o1', order: 0 }, { id: 'o2', order: 1 }];
    await useCase.execute('s1', items);
    expect(repo.reorder).toHaveBeenCalledWith('s1', items);
  });
});
