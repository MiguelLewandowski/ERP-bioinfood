import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { IPipelineRepository, PIPELINE_REPOSITORY } from '../domain/pipeline.repository';

@Injectable()
export class DeletePipelineUseCase {
  constructor(@Inject(PIPELINE_REPOSITORY) private repo: IPipelineRepository) {}

  async execute(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Funil não encontrado');
    if (existing.isDefault) {
      throw new ConflictException('Não é possível excluir o funil padrão. Defina outro como padrão primeiro.');
    }
    await this.repo.softDelete(id);
  }
}
