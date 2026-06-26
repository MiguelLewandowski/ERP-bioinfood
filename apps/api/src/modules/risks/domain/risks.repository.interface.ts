import { CreateRiskData, RiskWithOwner, UpdateRiskData } from './risk.entity';

export const RISK_REPOSITORY = 'RISK_REPOSITORY';

export interface IRiskRepository {
  findAllByProject(projectId: string): Promise<RiskWithOwner[]>;
  findById(id: string): Promise<RiskWithOwner | null>;
  create(data: CreateRiskData & { score: number }): Promise<RiskWithOwner>;
  update(id: string, data: UpdateRiskData & { score?: number }): Promise<RiskWithOwner>;
  softDelete(id: string): Promise<void>;
}
