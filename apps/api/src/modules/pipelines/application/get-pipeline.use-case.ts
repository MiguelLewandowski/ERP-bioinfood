import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IPipelineRepository, PIPELINE_REPOSITORY } from '../domain/pipeline.repository';

@Injectable()
export class GetPipelineUseCase {
  constructor(@Inject(PIPELINE_REPOSITORY) private repo: IPipelineRepository) {}

  async execute(id: string) {
    const pipeline = await this.repo.findById(id);
    if (!pipeline) throw new NotFoundException('Funil não encontrado');
    return pipeline;
  }
}
