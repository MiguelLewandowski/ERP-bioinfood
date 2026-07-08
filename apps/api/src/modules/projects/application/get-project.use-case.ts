import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { IProjectRepository, PROJECT_REPOSITORY } from '../domain/project.repository';
import { AuthUser, ProjectWithRelations } from '../domain/project.entity';

@Injectable()
export class GetProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private repo: IProjectRepository) {}

  async execute(id: string, user: AuthUser): Promise<ProjectWithRelations> {
    const project = await this.repo.findById(id);
    if (!project) throw new NotFoundException('Projeto não encontrado');

    if (user.role === SystemRole.PORTAL) {
      const hasAccess = project.accesses.some((a) => a.userId === user.id);
      if (!hasAccess) throw new ForbiddenException('Acesso não autorizado');
    }

    return project;
  }
}
