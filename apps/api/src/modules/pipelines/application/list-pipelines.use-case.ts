import { Injectable, Inject } from '@nestjs/common';
import { IPipelineRepository, PIPELINE_REPOSITORY } from '../domain/pipeline.repository';

@Injectable()
export class ListPipelinesUseCase {
  constructor(@Inject(PIPELINE_REPOSITORY) private repo: IPipelineRepository) {}

  execute() {
    return this.repo.findAll();
  }
}
