import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IPopRepository, POP_REPOSITORY } from '../domain/pops.repository.interface';
import { UpdatePopData } from '../domain/pop.entity';

@Injectable()
export class UpdatePopUseCase {
  constructor(@Inject(POP_REPOSITORY) private repo: IPopRepository) {}

  async execute(projectId: string, id: string, data: UpdatePopData) {
    const pop = await this.repo.findById(id);
    if (!pop) throw new NotFoundException('POP não encontrada');
    if (pop.projectId !== projectId) throw new ForbiddenException('POP não pertence a este projeto');
    return this.repo.update(id, data);
  }
}
