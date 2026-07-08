import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PIPELINE_REPOSITORY } from './domain/pipeline.repository';
import { PipelinesPrismaRepository } from './infra/pipelines.prisma.repository';
import { PipelinesController } from './infra/pipelines.controller';
import { ListPipelinesUseCase } from './application/list-pipelines.use-case';
import { GetPipelineUseCase } from './application/get-pipeline.use-case';
import { CreatePipelineUseCase } from './application/create-pipeline.use-case';
import { UpdatePipelineUseCase } from './application/update-pipeline.use-case';
import { DeletePipelineUseCase } from './application/delete-pipeline.use-case';
import { ManageStagesUseCase } from './application/manage-stages.use-case';
import { GetPipelineSummaryUseCase } from './application/get-pipeline-summary.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [PipelinesController],
  providers: [
    { provide: PIPELINE_REPOSITORY, useClass: PipelinesPrismaRepository },
    ListPipelinesUseCase,
    GetPipelineUseCase,
    CreatePipelineUseCase,
    UpdatePipelineUseCase,
    DeletePipelineUseCase,
    ManageStagesUseCase,
    GetPipelineSummaryUseCase,
  ],
})
export class PipelinesModule {}
