import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOpportunityRepository, OPPORTUNITY_REPOSITORY } from '../domain/opportunity.repository';
import { UpdateOpportunityData } from '../domain/opportunity.entity';

@Injectable()
export class UpdateOpportunityUseCase {
  constructor(@Inject(OPPORTUNITY_REPOSITORY) private repo: IOpportunityRepository) {}

  async execute(id: string, data: UpdateOpportunityData) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Oportunidade não encontrada');
    return this.repo.update(id, data);
  }
}
