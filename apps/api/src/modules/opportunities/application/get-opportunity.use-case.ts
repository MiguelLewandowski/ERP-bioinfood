import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOpportunityRepository, OPPORTUNITY_REPOSITORY } from '../domain/opportunity.repository';

@Injectable()
export class GetOpportunityUseCase {
  constructor(@Inject(OPPORTUNITY_REPOSITORY) private repo: IOpportunityRepository) {}

  async execute(id: string) {
    const opportunity = await this.repo.findById(id);
    if (!opportunity) throw new NotFoundException('Oportunidade não encontrada');
    return opportunity;
  }
}
