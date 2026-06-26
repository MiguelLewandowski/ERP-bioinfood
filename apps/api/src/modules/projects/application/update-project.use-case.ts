import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IProjectRepository, PROJECT_REPOSITORY } from '../domain/project.repository';
import { UpdateProjectData } from '../domain/project.entity';
import { assertProjectStatusTransition } from '../../../common/state-machine/project-status.machine';

@Injectable()
export class UpdateProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private repo: IProjectRepository) {}

  async execute(id: string, data: UpdateProjectData) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Projeto não encontrado');

    if (data.status && data.status !== existing.status) {
      assertProjectStatusTransition(existing.status, data.status);
    }

    return this.repo.update(id, data);
  }
}
