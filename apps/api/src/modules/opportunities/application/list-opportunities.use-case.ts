import { Injectable, Inject } from '@nestjs/common';
import { IOpportunityRepository, OPPORTUNITY_REPOSITORY } from '../domain/opportunity.repository';

@Injectable()
export class ListOpportunitiesUseCase {
  constructor(@Inject(OPPORTUNITY_REPOSITORY) private repo: IOpportunityRepository) {}

  execute(pipelineId: string) {
    return this.repo.findByPipeline(pipelineId);
  }
}
