import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IRiskRepository, RISK_REPOSITORY } from '../domain/risks.repository.interface';
import { UpdateRiskData, calculateRiskScore } from '../domain/risk.entity';
import { RiskProbability, RiskImpact } from '@prisma/client';

@Injectable()
export class UpdateRiskUseCase {
  constructor(@Inject(RISK_REPOSITORY) private repo: IRiskRepository) {}

  async execute(projectId: string, id: string, data: UpdateRiskData) {
    const risk = await this.repo.findById(id);
    if (!risk) throw new NotFoundException('Risk not found');
    if (risk.projectId !== projectId) throw new ForbiddenException('Risk não pertence a este projeto');

    const probability = data.probability ?? risk.probability;
    const impact = data.impact ?? risk.impact;
    const score = calculateRiskScore(probability as RiskProbability, impact as RiskImpact);

    return this.repo.update(id, { ...data, score });
  }
}
