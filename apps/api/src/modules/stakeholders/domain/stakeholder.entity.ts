import { StakeholderType, RiskImpact } from '@prisma/client';

// Grade Poder × Interesse (PMBOK, Guia PMBOK 7ª ed. — Modelo de Mendelow):
// classifica cada parte interessada num dos 4 quadrantes de engajamento a
// partir de influência (poder) e interesse. Bucket em HIGH: {HIGH, VERY_HIGH};
// o resto (VERY_LOW/LOW/MEDIUM) cai em "baixo" — MEDIUM puxa pro lado
// conservador (menos intervenção) até o usuário sinalizar HIGH/VERY_HIGH.
export type PowerInterestQuadrant =
  | 'MANAGE_CLOSELY' // alto poder, alto interesse
  | 'KEEP_SATISFIED' // alto poder, baixo interesse
  | 'KEEP_INFORMED' // baixo poder, alto interesse
  | 'MONITOR'; // baixo poder, baixo interesse

const HIGH_LEVELS = new Set<RiskImpact>([RiskImpact.HIGH, RiskImpact.VERY_HIGH]);

export function calculatePowerInterestQuadrant(
  influence: RiskImpact | null,
  interest: RiskImpact | null,
): PowerInterestQuadrant | null {
  if (!influence || !interest) return null;
  const highPower = HIGH_LEVELS.has(influence);
  const highInterest = HIGH_LEVELS.has(interest);
  if (highPower && highInterest) return 'MANAGE_CLOSELY';
  if (highPower && !highInterest) return 'KEEP_SATISFIED';
  if (!highPower && highInterest) return 'KEEP_INFORMED';
  return 'MONITOR';
}

export interface StakeholderEntity {
  id: string;
  projectId: string;
  contactId: string;
  type: StakeholderType;
  roleNote: string | null;
  influence: RiskImpact | null;
  interest: RiskImpact | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StakeholderWithContact extends StakeholderEntity {
  contact: { id: string; name: string; email: string | null; phone: string | null };
  quadrant: PowerInterestQuadrant | null;
}

export interface CreateStakeholderData {
  projectId: string;
  contactId: string;
  type: StakeholderType;
  roleNote?: string;
  influence?: RiskImpact;
  interest?: RiskImpact;
}

export interface UpdateStakeholderData {
  type?: StakeholderType;
  roleNote?: string | null;
  influence?: RiskImpact | null;
  interest?: RiskImpact | null;
}
