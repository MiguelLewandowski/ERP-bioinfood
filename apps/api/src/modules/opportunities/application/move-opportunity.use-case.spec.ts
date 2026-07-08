import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StageType } from '@prisma/client';
import { MoveOpportunityUseCase } from './move-opportunity.use-case';
import { IOpportunityRepository } from '../domain/opportunity.repository';

function makeRepo(overrides: Partial<IOpportunityRepository> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'o1', pipelineId: 'p1' }),
    findStageRef: vi.fn().mockResolvedValue({ id: 's2', pipelineId: 'p1', type: StageType.WON, probability: 100 }),
    move: vi.fn().mockImplementation((_id, data) => Promise.resolve({ id: 'o1', ...data })),
    ...overrides,
  } as unknown as IOpportunityRepository;
}

describe('MoveOpportunityUseCase', () => {
  let repo: IOpportunityRepository;
  let useCase: MoveOpportunityUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new MoveOpportunityUseCase(repo);
  });

  it('should reject a target stage from a different pipeline (anti-IDOR)', async () => {
    repo = makeRepo({
      findStageRef: vi.fn().mockResolvedValue({ id: 's9', pipelineId: 'OTHER', type: StageType.OPEN, probability: 10 }),
    });
    useCase = new MoveOpportunityUseCase(repo);

    await expect(useCase.execute('o1', 's9', null)).rejects.toThrow(BadRequestException);
    expect(repo.move).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when the opportunity does not exist', async () => {
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new MoveOpportunityUseCase(repo);
    await expect(useCase.execute('missing', 's2', null)).rejects.toThrow(NotFoundException);
  });

  it('should persist the resolved state machine result (WON stamps closedAt)', async () => {
    await useCase.execute('o1', 's2', null);
    expect(repo.move).toHaveBeenCalledWith('o1', expect.objectContaining({
      stageId: 's2', probability: 100, lostReason: null,
    }));
    const arg = (repo.move as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(arg.closedAt).toBeInstanceOf(Date);
  });
});
