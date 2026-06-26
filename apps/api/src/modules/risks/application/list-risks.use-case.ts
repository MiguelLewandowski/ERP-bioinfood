import { Injectable, Inject } from '@nestjs/common';
import { IRiskRepository, RISK_REPOSITORY } from '../domain/risks.repository.interface';

@Injectable()
export class ListRisksUseCase {
  constructor(@Inject(RISK_REPOSITORY) private repo: IRiskRepository) {}

  execute(projectId: string) {
    return this.repo.findAllByProject(projectId);
  }
}
