import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { IProjectRepository, PROJECT_REPOSITORY } from '../domain/project.repository';

@Injectable()
export class CancelProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private repo: IProjectRepository) {}

  async execute(id: string): Promise<void> {
    const exists = await this.repo.findById(id);
    if (!exists) throw new NotFoundException('Projeto não encontrado');
    await this.repo.updateStatus(id, ProjectStatus.CANCELLED);
  }
}
