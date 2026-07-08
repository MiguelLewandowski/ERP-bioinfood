import { Injectable, Inject } from '@nestjs/common';
import { IStakeholderRepository, STAKEHOLDER_REPOSITORY } from '../domain/stakeholders.repository.interface';

@Injectable()
export class ListStakeholdersUseCase {
  constructor(@Inject(STAKEHOLDER_REPOSITORY) private repo: IStakeholderRepository) {}

  execute(projectId: string) {
    return this.repo.findAllByProject(projectId);
  }
}
