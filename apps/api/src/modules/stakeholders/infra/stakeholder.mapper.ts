import { RiskImpact, StakeholderType } from '@prisma/client';
import { PowerInterestQuadrant, StakeholderWithContact } from '../domain/stakeholder.entity';

export interface StakeholderDto {
  id: string;
  projectId: string;
  contactId: string;
  type: StakeholderType;
  roleNote: string | null;
  influence: RiskImpact | null;
  interest: RiskImpact | null;
  quadrant: PowerInterestQuadrant | null;
  contact: { id: string; name: string; email: string | null; phone: string | null };
}

export function toStakeholderDto(s: StakeholderWithContact): StakeholderDto {
  return {
    id: s.id,
    projectId: s.projectId,
    contactId: s.contactId,
    type: s.type,
    roleNote: s.roleNote,
    influence: s.influence,
    interest: s.interest,
    quadrant: s.quadrant,
    contact: s.contact,
  };
}
