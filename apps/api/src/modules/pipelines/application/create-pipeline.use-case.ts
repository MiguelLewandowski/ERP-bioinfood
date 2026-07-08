import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { StageType } from '@prisma/client';
import { IPipelineRepository, PIPELINE_REPOSITORY } from '../domain/pipeline.repository';
import { CreatePipelineData } from '../domain/pipeline.entity';

@Injectable()
export class CreatePipelineUseCase {
  constructor(@Inject(PIPELINE_REPOSITORY) private repo: IPipelineRepository) {}

  async execute(data: CreatePipelineData) {
    // Every pipeline needs at least one OPEN stage to be usable.
    const stages = data.stages ?? [];
    if (stages.length > 0 && !stages.some((s) => (s.type ?? StageType.OPEN) === StageType.OPEN)) {
      throw new BadRequestException('O funil precisa de ao menos uma etapa do tipo OPEN');
    }

    // First pipeline created becomes the default automatically.
    const isFirst = (await this.repo.countPipelines()) === 0;
    const pipeline = await this.repo.create({ ...data, isDefault: data.isDefault || isFirst });

    if (pipeline.isDefault) await this.repo.clearDefaultExcept(pipeline.id);
    return pipeline;
  }
}
