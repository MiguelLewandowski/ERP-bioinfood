import { Inject, Injectable } from '@nestjs/common';
import { INTERACTION_REPOSITORY, IInteractionRepository } from '../domain/interaction.repository';
import { CreateInteractionData } from '../domain/interaction.entity';

@Injectable()
export class CreateInteractionUseCase {
  constructor(
    @Inject(INTERACTION_REPOSITORY) private repo: IInteractionRepository,
  ) {}

  execute(data: CreateInteractionData) {
    return this.repo.create(data);
  }
}
