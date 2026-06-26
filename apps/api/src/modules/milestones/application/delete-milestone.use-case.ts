import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IMilestoneRepository, MILESTONE_REPOSITORY } from '../domain/milestones.repository.interface';

@Injectable()
export class DeleteMilestoneUseCase {
  constructor(@Inject(MILESTONE_REPOSITORY) private repo: IMilestoneRepository) {}

  async execute(projectId: string, id: string) {
    const milestone = await this.repo.findById(id);
    if (!milestone) throw new NotFoundException('Milestone not found');
    if (milestone.projectId !== projectId) throw new ForbiddenException('Milestone não pertence a este projeto');
    await this.repo.softDelete(id);
  }
}
