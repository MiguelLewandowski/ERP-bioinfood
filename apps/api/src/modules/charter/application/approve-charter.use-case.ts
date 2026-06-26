import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICharterRepository, CHARTER_REPOSITORY } from '../domain/charter.repository.interface';

@Injectable()
export class ApproveCharterUseCase {
  constructor(@Inject(CHARTER_REPOSITORY) private repo: ICharterRepository) {}

  async execute(projectId: string, approvedById: string) {
    const charter = await this.repo.findByProject(projectId);
    if (!charter) throw new NotFoundException('Charter not found');
    return this.repo.approve(projectId, approvedById);
  }
}
