import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IProjectRepository, PROJECT_REPOSITORY } from '../domain/project.repository';

// Exclusão DEFINITIVA do projeto (hard delete). Diferente de CancelProjectUseCase
// (soft, status CANCELLED). Restrito a ADMIN no controller. O cascade do schema
// remove tasks, riscos, marcos, WBS, charter, stakeholders e acessos junto.
@Injectable()
export class DeleteProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private repo: IProjectRepository) {}

  async execute(id: string): Promise<void> {
    const exists = await this.repo.findById(id);
    if (!exists) throw new NotFoundException('Projeto não encontrado');
    await this.repo.delete(id);
  }
}
