import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICharterRepository, CHARTER_REPOSITORY } from '../domain/charter.repository.interface';
import { CharterWithMeta } from '../domain/charter.entity';

@Injectable()
export class ApproveCharterUseCase {
  constructor(@Inject(CHARTER_REPOSITORY) private repo: ICharterRepository) {}

  async execute(projectId: string, approvedById: string): Promise<CharterWithMeta> {
    const existing = await this.repo.findByProject(projectId);
    if (!existing) throw new NotFoundException('Charter not found');
    const charter = await this.repo.approve(projectId, approvedById);
    const lastEdit = await this.repo.findLastEdit(charter.id);
    return {
      ...charter,
      lastEditedBy: lastEdit?.actor ?? null,
      lastEditedAt: lastEdit?.at ?? null,
    };
  }
}
