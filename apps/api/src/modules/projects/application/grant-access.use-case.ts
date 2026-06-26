import { Injectable, Inject } from '@nestjs/common';
import { IProjectRepository, PROJECT_REPOSITORY } from '../domain/project.repository';
import { ProjectAccessEntity } from '../domain/project.entity';

@Injectable()
export class GrantAccessUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private repo: IProjectRepository) {}

  async execute(projectId: string, userId: string, grantedById: string): Promise<ProjectAccessEntity> {
    return this.repo.grantAccess(projectId, userId, grantedById);
  }
}
