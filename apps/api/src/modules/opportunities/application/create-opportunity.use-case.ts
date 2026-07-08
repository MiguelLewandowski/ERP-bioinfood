import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IOpportunityRepository, OPPORTUNITY_REPOSITORY } from '../domain/opportunity.repository';
import { CreateOpportunityData } from '../domain/opportunity.entity';

@Injectable()
export class CreateOpportunityUseCase {
  constructor(@Inject(OPPORTUNITY_REPOSITORY) private repo: IOpportunityRepository) {}

  async execute(data: CreateOpportunityData) {
    // The initial stage must belong to the chosen pipeline (anti-IDOR of funnel).
    const stage = await this.repo.findStageRef(data.stageId);
    if (!stage || stage.pipelineId !== data.pipelineId) {
      throw new BadRequestException('Etapa inválida para este funil');
    }
    // Seed probability from the stage default when the caller didn't set one.
    const probability = data.probability ?? stage.probability;
    return this.repo.create({ ...data, probability });
  }
}
