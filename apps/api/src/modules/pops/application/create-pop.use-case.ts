import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IPopRepository, POP_REPOSITORY } from '../domain/pops.repository.interface';
import { CreatePopData } from '../domain/pop.entity';

@Injectable()
export class CreatePopUseCase {
  constructor(@Inject(POP_REPOSITORY) private repo: IPopRepository) {}

  // Cria a Pop e a v1 de PopVersion numa única transação (repositório) —
  // nunca existe POP sem conteúdo.
  async execute(data: CreatePopData) {
    // Sem isto o Prisma devolveria erro cru de FK. Toda POP tem categoria.
    if (!(await this.repo.categoryExists(data.categoryId))) {
      throw new BadRequestException('Categoria de POP inválida');
    }
    return this.repo.create(data);
  }
}
