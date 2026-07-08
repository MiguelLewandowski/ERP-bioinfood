import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IStakeholderRepository, STAKEHOLDER_REPOSITORY } from '../domain/stakeholders.repository.interface';

@Injectable()
export class DeleteStakeholderUseCase {
  constructor(@Inject(STAKEHOLDER_REPOSITORY) private repo: IStakeholderRepository) {}

  async execute(projectId: string, id: string) {
    const stakeholder = await this.repo.findById(id);
    if (!stakeholder) throw new NotFoundException('Parte interessada não encontrada');
    if (stakeholder.projectId !== projectId) {
      throw new ForbiddenException('Parte interessada não pertence a este projeto');
    }
    await this.repo.remove(id);
  }
}
