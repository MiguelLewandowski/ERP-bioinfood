import { Injectable, Inject } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { IProjectRepository, PROJECT_REPOSITORY } from '../domain/project.repository';
import { AuthUser, ProjectWithRelations } from '../domain/project.entity';

@Injectable()
export class ListProjectsUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private repo: IProjectRepository) {}

  async execute(user: AuthUser): Promise<ProjectWithRelations[]> {
    if (user.role === SystemRole.CLIENTE) {
      return this.repo.findAllByUserId(user.id);
    }
    return this.repo.findAll({ excludeCancelled: true });
  }
}
