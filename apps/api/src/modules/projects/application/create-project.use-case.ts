import { Injectable, Inject } from '@nestjs/common';
import { IProjectRepository, PROJECT_REPOSITORY } from '../domain/project.repository';
import { CreateProjectData, ProjectWithRelations } from '../domain/project.entity';

@Injectable()
export class CreateProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private repo: IProjectRepository) {}

  async execute(data: CreateProjectData): Promise<ProjectWithRelations> {
    return this.repo.create(data);
  }
}
