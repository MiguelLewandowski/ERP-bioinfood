import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IPopRepository, POP_REPOSITORY } from '../domain/pops.repository.interface';
import { CreatePopVersionData } from '../domain/pop.entity';

@Injectable()
export class CreatePopVersionUseCase {
  constructor(@Inject(POP_REPOSITORY) private repo: IPopRepository) {}

  async execute(projectId: string, popId: string, data: CreatePopVersionData) {
    const pop = await this.repo.findById(popId);
    if (!pop) throw new NotFoundException('POP não encontrada');
    if (pop.projectId !== projectId) throw new ForbiddenException('POP não pertence a este projeto');
    // Versões são imutáveis: isto sempre cria uma linha nova, nunca edita
    // uma PopVersion existente.
    return this.repo.createVersion(popId, data);
  }
}
