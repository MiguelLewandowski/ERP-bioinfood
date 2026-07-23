import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IPopRepository, POP_REPOSITORY } from '../domain/pops.repository.interface';
import { UpdatePopData } from '../domain/pop.entity';

@Injectable()
export class UpdatePopUseCase {
  constructor(@Inject(POP_REPOSITORY) private repo: IPopRepository) {}

  async execute(id: string, data: UpdatePopData) {
    const pop = await this.repo.findById(id);
    if (!pop) throw new NotFoundException('POP não encontrada');
    if (data.categoryId && !(await this.repo.categoryExists(data.categoryId))) {
      throw new BadRequestException('Categoria de POP inválida');
    }
    return this.repo.update(id, data);
  }
}
