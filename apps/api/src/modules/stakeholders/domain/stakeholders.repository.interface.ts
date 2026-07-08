import { CreateStakeholderData, StakeholderWithContact, UpdateStakeholderData } from './stakeholder.entity';

export const STAKEHOLDER_REPOSITORY = 'STAKEHOLDER_REPOSITORY';

export interface IStakeholderRepository {
  findAllByProject(projectId: string): Promise<StakeholderWithContact[]>;
  findById(id: string): Promise<StakeholderWithContact | null>;
  create(data: CreateStakeholderData): Promise<StakeholderWithContact>;
  update(id: string, data: UpdateStakeholderData): Promise<StakeholderWithContact>;
  remove(id: string): Promise<void>;
}
