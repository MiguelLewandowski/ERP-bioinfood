import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IStakeholderRepository, STAKEHOLDER_REPOSITORY } from '../domain/stakeholders.repository.interface';
import { UpdateStakeholderData } from '../domain/stakeholder.entity';

@Injectable()
export class UpdateStakeholderUseCase {
  constructor(@Inject(STAKEHOLDER_REPOSITORY) private repo: IStakeholderRepository) {}

  async execute(projectId: string, id: string, data: UpdateStakeholderData) {
    const stakeholder = await this.repo.findById(id);
    if (!stakeholder) throw new NotFoundException('Parte interessada não encontrada');
    if (stakeholder.projectId !== projectId) {
      throw new ForbiddenException('Parte interessada não pertence a este projeto');
    }
    return this.repo.update(id, data);
  }
}
