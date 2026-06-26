import { Injectable, Inject } from '@nestjs/common';
import { IMilestoneRepository, MILESTONE_REPOSITORY } from '../domain/milestones.repository.interface';
import { CreateMilestoneData } from '../domain/milestone.entity';

@Injectable()
export class CreateMilestoneUseCase {
  constructor(@Inject(MILESTONE_REPOSITORY) private repo: IMilestoneRepository) {}

  execute(data: CreateMilestoneData) {
    return this.repo.create(data);
  }
}
