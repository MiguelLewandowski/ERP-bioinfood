import { RiskProbability, RiskImpact } from '@prisma/client';

const SCORE_MAP: Record<string, number> = {
  VERY_LOW: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  VERY_HIGH: 5,
};

export function calculateRiskScore(probability: RiskProbability, impact: RiskImpact): number {
  return SCORE_MAP[probability] * SCORE_MAP[impact];
}

export interface RiskEntity {
  id: string;
  projectId: string;
  ownerId: string | null;
  title: string;
  description: string | null;
  probability: RiskProbability;
  impact: RiskImpact;
  score: number;
  response: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface RiskWithOwner extends RiskEntity {
  owner: { id: string; name: string } | null;
  /** Quem divide a responsabilidade com o `owner`. */
  coOwners: Array<{ user: { id: string; name: string } }>;
}

export interface CreateRiskData {
  projectId: string;
  ownerId?: string;
  /** Corresponsáveis, além do principal. */
  coOwnerIds?: string[];
  title: string;
  description?: string;
  probability: RiskProbability;
  impact: RiskImpact;
  response?: string;
}

export interface UpdateRiskData {
  ownerId?: string | null;
  /** Substitui a lista inteira quando presente; ausente = não mexe. */
  coOwnerIds?: string[];
  title?: string;
  description?: string | null;
  probability?: RiskProbability;
  impact?: RiskImpact;
  response?: string | null;
}
