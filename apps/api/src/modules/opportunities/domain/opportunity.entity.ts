import { StageType } from '@prisma/client';

export interface OpportunityListItem {
  id: string;
  title: string;
  amount: string | null;
  currency: string;
  probability: number | null;
  pipelineId: string;
  stageId: string;
  startDate: string | null;
  description: string | null;
  expectedCloseDate: string | null;
  closedAt: string | null;
  // Marcador ortogonal à etapa: negócio pausado, fora do funil ativo, sem
  // perder o histórico de etapa/valor — decisão 7 do crm-redesign-2026-07.
  frozenAt: string | null;
  organization: { id: string; legalName: string; tradeName: string | null };
  mainContact: { id: string; name: string } | null;
  responsible: { id: string; name: string } | null;
  engagementStageId: string | null;
  pipeline: { id: string; name: string };
  stage: { id: string; name: string; type: StageType };
}

export interface CreateOpportunityData {
  orgId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  amount?: number;
  currency?: string;
  probability?: number;
  mainContactId?: string;
  responsibleId?: string;
  engagementStageId?: string;
  startDate?: Date;
  description?: string;
  expectedCloseDate?: Date;
}

export interface UpdateOpportunityData {
  title?: string;
  amount?: number | null;
  currency?: string;
  probability?: number | null;
  mainContactId?: string | null;
  responsibleId?: string | null;
  engagementStageId?: string | null;
  startDate?: Date | null;
  description?: string | null;
  expectedCloseDate?: Date | null;
  frozenAt?: Date | null;
}

// Target stage resolved from the destination stage's pipeline + type, so the
// move use-case can apply the state machine (probability, closedAt, lostReason).
export interface StageRef {
  id: string;
  pipelineId: string;
  type: StageType;
  probability: number;
}

export interface MoveResult {
  probability: number;
  closedAt: Date | null;
  lostReason: string | null;
}
