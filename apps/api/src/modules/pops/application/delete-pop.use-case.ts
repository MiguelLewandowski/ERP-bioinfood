import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IPopRepository, POP_REPOSITORY } from '../domain/pops.repository.interface';

@Injectable()
export class DeletePopUseCase {
  constructor(@Inject(POP_REPOSITORY) private repo: IPopRepository) {}

  async execute(id: string) {
    const pop = await this.repo.findById(id);
    if (!pop) throw new NotFoundException('POP não encontrada');
    await this.repo.softDelete(id);
  }
}
