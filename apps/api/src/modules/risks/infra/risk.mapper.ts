import { RiskImpact, RiskProbability } from '@prisma/client';
import { RiskWithOwner } from '../domain/risk.entity';

export interface RiskDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  probability: RiskProbability;
  impact: RiskImpact;
  score: number;
  response: string | null;
  owner: { id: string; name: string } | null;
  /** Corresponsáveis, além do `owner`. Vazio quando ninguém divide. */
  coOwners: Array<{ id: string; name: string }>;
}

export function toRiskDto(r: RiskWithOwner): RiskDto {
  return {
    id: r.id,
    projectId: r.projectId,
    title: r.title,
    description: r.description,
    probability: r.probability,
    impact: r.impact,
    score: r.score,
    response: r.response,
    owner: r.owner,
    coOwners: (r.coOwners ?? []).map((c) => c.user),
  };
}
