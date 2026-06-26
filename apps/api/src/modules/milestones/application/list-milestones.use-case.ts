import { Injectable, Inject } from '@nestjs/common';
import { IMilestoneRepository, MILESTONE_REPOSITORY } from '../domain/milestones.repository.interface';

@Injectable()
export class ListMilestonesUseCase {
  constructor(@Inject(MILESTONE_REPOSITORY) private repo: IMilestoneRepository) {}

  execute(projectId: string) {
    return this.repo.findAllByProject(projectId);
  }
}
