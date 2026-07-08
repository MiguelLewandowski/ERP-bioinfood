import {
  CreateCrmActivityData,
  CrmActivityListItem,
  ListCrmActivitiesFilter,
  UpdateCrmActivityData,
} from './crm-activity.entity';

export const CRM_ACTIVITY_REPOSITORY = 'CRM_ACTIVITY_REPOSITORY';

export interface ICrmActivityRepository {
  list(filter: ListCrmActivitiesFilter): Promise<CrmActivityListItem[]>;
  findById(id: string): Promise<CrmActivityListItem | null>;
  create(data: CreateCrmActivityData): Promise<CrmActivityListItem>;
  update(id: string, data: UpdateCrmActivityData & { completedAt?: Date | null }): Promise<CrmActivityListItem>;
  delete(id: string): Promise<void>;
}
