import { Injectable, Inject } from '@nestjs/common';
import { IRiskRepository, RISK_REPOSITORY } from '../domain/risks.repository.interface';
import { CreateRiskData, calculateRiskScore } from '../domain/risk.entity';

@Injectable()
export class CreateRiskUseCase {
  constructor(@Inject(RISK_REPOSITORY) private repo: IRiskRepository) {}

  execute(data: CreateRiskData) {
    const score = calculateRiskScore(data.probability, data.impact);
    return this.repo.create({ ...data, score });
  }
}
