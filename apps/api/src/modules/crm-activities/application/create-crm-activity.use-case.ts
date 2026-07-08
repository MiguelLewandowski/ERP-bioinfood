import { Inject, Injectable } from '@nestjs/common';
import { CRM_ACTIVITY_REPOSITORY, ICrmActivityRepository } from '../domain/crm-activity.repository';
import { CreateCrmActivityData } from '../domain/crm-activity.entity';

@Injectable()
export class CreateCrmActivityUseCase {
  constructor(
    @Inject(CRM_ACTIVITY_REPOSITORY) private repo: ICrmActivityRepository,
  ) {}

  execute(data: CreateCrmActivityData) {
    return this.repo.create(data);
  }
}
