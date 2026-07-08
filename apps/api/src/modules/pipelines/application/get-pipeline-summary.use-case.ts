import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IPipelineRepository, PIPELINE_REPOSITORY } from '../domain/pipeline.repository';

@Injectable()
export class GetPipelineSummaryUseCase {
  constructor(@Inject(PIPELINE_REPOSITORY) private repo: IPipelineRepository) {}

  async execute(pipelineId: string) {
    const pipeline = await this.repo.findById(pipelineId);
    if (!pipeline) throw new NotFoundException('Funil não encontrado');
    return this.repo.summary(pipelineId);
  }
}
