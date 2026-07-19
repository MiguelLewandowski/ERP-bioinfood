import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOpportunityRepository, OPPORTUNITY_REPOSITORY } from '../domain/opportunity.repository';
import { ReorderItem } from '../domain/opportunity.entity';

@Injectable()
export class ReorderOpportunitiesUseCase {
  constructor(@Inject(OPPORTUNITY_REPOSITORY) private repo: IOpportunityRepository) {}

  async execute(stageId: string, items: ReorderItem[]) {
    const stage = await this.repo.findStageRef(stageId);
    if (!stage) throw new NotFoundException('Etapa não encontrada');
    await this.repo.reorder(stageId, items);
  }
}
