import { Injectable, Inject } from '@nestjs/common';
import { IPipelineRepository, PIPELINE_REPOSITORY } from '../domain/pipeline.repository';
import { CreatePipelineData } from '../domain/pipeline.entity';

@Injectable()
export class CreatePipelineUseCase {
  constructor(@Inject(PIPELINE_REPOSITORY) private repo: IPipelineRepository) {}

  async execute(data: CreatePipelineData) {
    // Funil novo nasce sem etapa OPEN — só Ganho/Perdido (ou nem isso). O
    // usuário adiciona as etapas abertas que fizerem sentido para o processo dele.

    // First pipeline created becomes the default automatically.
    const isFirst = (await this.repo.countPipelines()) === 0;
    const pipeline = await this.repo.create({ ...data, isDefault: data.isDefault || isFirst });

    if (pipeline.isDefault) await this.repo.clearDefaultExcept(pipeline.id);
    return pipeline;
  }
}
