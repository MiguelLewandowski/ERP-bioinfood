import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IProjectRepository, PROJECT_REPOSITORY } from '../domain/project.repository';

@Injectable()
export class SetBaselineUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private repo: IProjectRepository) {}

  async execute(projectId: string, userId: string) {
    const existing = await this.repo.findById(projectId);
    if (!existing) throw new NotFoundException('Projeto não encontrado');

    // Congela o cronograma atual como linha de base (PMBOK: schedule baseline).
    return this.repo.setBaseline(projectId, userId);
  }
}
