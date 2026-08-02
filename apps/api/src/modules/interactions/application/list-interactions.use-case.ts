import { Inject, Injectable } from '@nestjs/common';
import { INTERACTION_REPOSITORY, IInteractionRepository } from '../domain/interaction.repository';
import { ListInteractionsFilter } from '../domain/interaction.entity';

@Injectable()
export class ListInteractionsUseCase {
  constructor(
    @Inject(INTERACTION_REPOSITORY) private repo: IInteractionRepository,
  ) {}

  execute(opportunityId: string, filter: ListInteractionsFilter) {
    return this.repo.findByOpportunity(opportunityId, filter);
  }
}
