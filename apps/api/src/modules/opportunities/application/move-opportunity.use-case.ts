import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOpportunityRepository, OPPORTUNITY_REPOSITORY } from '../domain/opportunity.repository';
import { resolveMove } from '../domain/opportunity.rules';

@Injectable()
export class MoveOpportunityUseCase {
  constructor(@Inject(OPPORTUNITY_REPOSITORY) private repo: IOpportunityRepository) {}

  async execute(id: string, stageId: string, lostReason: string | null) {
    const opp = await this.repo.findById(id);
    if (!opp) throw new NotFoundException('Oportunidade não encontrada');

    const target = await this.repo.findStageRef(stageId);
    if (!target) throw new NotFoundException('Etapa não encontrada');
    // A etapa de destino define o funil: mover para uma etapa de outro pipeline
    // move a oportunidade de funil também (decisão: permitir troca de funil).

    const result = resolveMove(target, lostReason, new Date());
    return this.repo.move(id, { stageId, pipelineId: target.pipelineId, ...result });
  }
}
