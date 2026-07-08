import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IPipelineRepository, PIPELINE_REPOSITORY } from '../domain/pipeline.repository';
import { UpdatePipelineData } from '../domain/pipeline.entity';

@Injectable()
export class UpdatePipelineUseCase {
  constructor(@Inject(PIPELINE_REPOSITORY) private repo: IPipelineRepository) {}

  async execute(id: string, data: UpdatePipelineData) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Funil não encontrado');

    const pipeline = await this.repo.update(id, data);
    // isDefault is single-valued: promoting one demotes all others.
    if (data.isDefault) await this.repo.clearDefaultExcept(id);
    return pipeline;
  }
}
