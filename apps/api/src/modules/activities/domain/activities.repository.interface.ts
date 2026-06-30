import { ActivityFilters, ActivityListItem } from './activity.entity';

export const ACTIVITIES_REPOSITORY = 'ACTIVITIES_REPOSITORY';

export interface IActivitiesRepository {
  findAllInRange(filters: ActivityFilters): Promise<ActivityListItem[]>;
  findAccessibleProjectIds(userId: string): Promise<string[]>;
}
