import { Inject, Injectable } from '@nestjs/common';
import { CRM_ACTIVITY_REPOSITORY, ICrmActivityRepository } from '../domain/crm-activity.repository';
import { ListCrmActivitiesFilter } from '../domain/crm-activity.entity';

@Injectable()
export class ListCrmActivitiesUseCase {
  constructor(
    @Inject(CRM_ACTIVITY_REPOSITORY) private repo: ICrmActivityRepository,
  ) {}

  execute(filter: ListCrmActivitiesFilter) {
    return this.repo.list(filter);
  }
}
