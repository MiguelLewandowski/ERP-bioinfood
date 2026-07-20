import { Injectable, Inject } from '@nestjs/common';
import { IPopRepository, POP_REPOSITORY } from '../domain/pops.repository.interface';
import { CreatePopData } from '../domain/pop.entity';

@Injectable()
export class CreatePopUseCase {
  constructor(@Inject(POP_REPOSITORY) private repo: IPopRepository) {}

  // Cria a Pop e a v1 de PopVersion numa única transação (repositório) —
  // nunca existe POP sem conteúdo.
  execute(data: CreatePopData) {
    return this.repo.create(data);
  }
}
