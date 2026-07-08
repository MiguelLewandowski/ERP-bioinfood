import { StageType } from '@prisma/client';
import { MoveResult, StageRef } from './opportunity.entity';

// State machine for moving an opportunity to a stage (decisions 5 & 8):
// - probability is overwritten by the target stage default;
// - entering WON/LOST stamps closedAt; LOST keeps a reason;
// - moving back to an OPEN stage reopens it (clears closedAt and lostReason).
export function resolveMove(target: StageRef, lostReason: string | null, now: Date): MoveResult {
  if (target.type === StageType.WON) {
    return { probability: target.probability, closedAt: now, lostReason: null };
  }
  if (target.type === StageType.LOST) {
    return { probability: target.probability, closedAt: now, lostReason: lostReason ?? null };
  }
  return { probability: target.probability, closedAt: null, lostReason: null };
}
