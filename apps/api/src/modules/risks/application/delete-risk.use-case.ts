import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IRiskRepository, RISK_REPOSITORY } from '../domain/risks.repository.interface';

@Injectable()
export class DeleteRiskUseCase {
  constructor(@Inject(RISK_REPOSITORY) private repo: IRiskRepository) {}

  async execute(projectId: string, id: string) {
    const risk = await this.repo.findById(id);
    if (!risk) throw new NotFoundException('Risk not found');
    if (risk.projectId !== projectId) throw new ForbiddenException('Risk não pertence a este projeto');
    await this.repo.softDelete(id);
  }
}
