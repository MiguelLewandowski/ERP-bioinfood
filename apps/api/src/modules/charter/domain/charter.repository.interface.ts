import { CharterEntity, CharterLastEdit, UpsertCharterData } from './charter.entity';

export const CHARTER_REPOSITORY = 'CHARTER_REPOSITORY';

export interface ICharterRepository {
  findByProject(projectId: string): Promise<CharterEntity | null>;
  upsert(projectId: string, data: UpsertCharterData): Promise<CharterEntity>;
  approve(projectId: string, approvedById: string): Promise<CharterEntity>;
  findLastEdit(charterId: string): Promise<CharterLastEdit | null>;
}
