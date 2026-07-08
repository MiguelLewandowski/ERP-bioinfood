import { Inject, Injectable } from '@nestjs/common';
import { CRM_ACTIVITY_REPOSITORY, ICrmActivityRepository } from '../domain/crm-activity.repository';

@Injectable()
export class DeleteCrmActivityUseCase {
  constructor(
    @Inject(CRM_ACTIVITY_REPOSITORY) private repo: ICrmActivityRepository,
  ) {}

  execute(id: string) {
    return this.repo.delete(id);
  }
}
