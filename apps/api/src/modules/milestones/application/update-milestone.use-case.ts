import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IMilestoneRepository, MILESTONE_REPOSITORY } from '../domain/milestones.repository.interface';
import { UpdateMilestoneData } from '../domain/milestone.entity';

@Injectable()
export class UpdateMilestoneUseCase {
  constructor(@Inject(MILESTONE_REPOSITORY) private repo: IMilestoneRepository) {}

  async execute(projectId: string, id: string, data: UpdateMilestoneData) {
    const milestone = await this.repo.findById(id);
    if (!milestone) throw new NotFoundException('Milestone not found');
    if (milestone.projectId !== projectId) throw new ForbiddenException('Milestone não pertence a este projeto');
    return this.repo.update(id, data);
  }
}
