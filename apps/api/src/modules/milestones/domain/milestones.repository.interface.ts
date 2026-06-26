import { CreateMilestoneData, MilestoneEntity, UpdateMilestoneData } from './milestone.entity';

export const MILESTONE_REPOSITORY = 'MILESTONE_REPOSITORY';

export interface IMilestoneRepository {
  findAllByProject(projectId: string): Promise<MilestoneEntity[]>;
  findById(id: string): Promise<MilestoneEntity | null>;
  create(data: CreateMilestoneData): Promise<MilestoneEntity>;
  update(id: string, data: UpdateMilestoneData): Promise<MilestoneEntity>;
  softDelete(id: string): Promise<void>;
}
