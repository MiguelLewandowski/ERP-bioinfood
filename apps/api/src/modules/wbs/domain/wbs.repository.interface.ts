import { CreateWbsNodeData, UpdateWbsNodeData, WbsNodeEntity, WbsNodeWithChildren } from './wbs-node.entity';

export const WBS_REPOSITORY = 'WBS_REPOSITORY';

export interface IWbsRepository {
  findAllByProject(projectId: string): Promise<WbsNodeEntity[]>;
  findById(id: string): Promise<WbsNodeWithChildren | null>;
  create(data: CreateWbsNodeData): Promise<WbsNodeEntity>;
  update(id: string, data: UpdateWbsNodeData): Promise<WbsNodeEntity>;
  softDelete(id: string): Promise<void>;
}
