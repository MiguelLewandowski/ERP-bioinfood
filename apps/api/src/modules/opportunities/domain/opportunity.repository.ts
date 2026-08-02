import {
  CreateOpportunityData,
  MoveResult,
  OpportunityListItem,
  ReorderItem,
  StageRef,
  UpdateOpportunityData,
} from './opportunity.entity';

export const OPPORTUNITY_REPOSITORY = 'OPPORTUNITY_REPOSITORY';

export interface MoveData {
  stageId: string;
  pipelineId: string;
  probability: number;
  closedAt: Date | null;
  lostReason: string | null;
}

export interface IOpportunityRepository {
  findByPipeline(pipelineId: string): Promise<OpportunityListItem[]>;
  findByOrg(orgId: string): Promise<OpportunityListItem[]>;
  findById(id: string): Promise<OpportunityListItem | null>;
  create(data: CreateOpportunityData): Promise<OpportunityListItem>;
  update(id: string, data: UpdateOpportunityData): Promise<OpportunityListItem>;
  softDelete(id: string): Promise<void>;
  move(id: string, data: MoveData): Promise<OpportunityListItem>;
  // Reordena os cards dentro de uma mesma etapa (drag reorder no kanban).
  reorder(stageId: string, items: ReorderItem[]): Promise<void>;

  // Stage lookup used to validate the target belongs to the opportunity's pipeline.
  findStageRef(stageId: string): Promise<StageRef | null>;
}

export type { MoveResult };
