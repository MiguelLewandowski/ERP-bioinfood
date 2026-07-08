import { Injectable, Inject } from '@nestjs/common';
import { IOpportunityRepository, OPPORTUNITY_REPOSITORY } from '../domain/opportunity.repository';

@Injectable()
export class ListOrgOpportunitiesUseCase {
  constructor(@Inject(OPPORTUNITY_REPOSITORY) private repo: IOpportunityRepository) {}

  execute(orgId: string) {
    return this.repo.findByOrg(orgId);
  }
}
