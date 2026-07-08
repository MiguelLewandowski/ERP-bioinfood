import { describe, it, expect } from 'vitest';
import { StageType } from '@prisma/client';
import { resolveMove } from './opportunity.rules';
import { StageRef } from './opportunity.entity';

const NOW = new Date('2026-07-05T12:00:00.000Z');

function stage(type: StageType, probability = 50): StageRef {
  return { id: 's1', pipelineId: 'p1', type, probability };
}

describe('resolveMove', () => {
  it('should overwrite probability with the target stage default on any move', () => {
    const result = resolveMove(stage(StageType.OPEN, 30), null, NOW);
    expect(result.probability).toBe(30);
  });

  it('should stamp closedAt and drop reason when entering a WON stage', () => {
    const result = resolveMove(stage(StageType.WON, 100), null, NOW);
    expect(result.closedAt).toEqual(NOW);
    expect(result.lostReason).toBeNull();
  });

  it('should stamp closedAt and keep the reason when entering a LOST stage', () => {
    const result = resolveMove(stage(StageType.LOST, 0), 'Preço', NOW);
    expect(result.closedAt).toEqual(NOW);
    expect(result.lostReason).toBe('Preço');
  });

  it('should clear closedAt and lostReason when reopening into an OPEN stage', () => {
    const result = resolveMove(stage(StageType.OPEN, 60), 'ignored', NOW);
    expect(result.closedAt).toBeNull();
    expect(result.lostReason).toBeNull();
  });
});
