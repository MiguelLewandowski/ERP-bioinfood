import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { StageType } from '@prisma/client';
import { IPipelineRepository, PIPELINE_REPOSITORY } from '../domain/pipeline.repository';
import { CreateStageData, ReorderItem, UpdateStageData } from '../domain/pipeline.entity';

@Injectable()
export class ManageStagesUseCase {
  constructor(@Inject(PIPELINE_REPOSITORY) private repo: IPipelineRepository) {}

  async add(pipelineId: string, data: CreateStageData) {
    await this.assertPipeline(pipelineId);
    return this.repo.addStage(pipelineId, data);
  }

  async update(pipelineId: string, stageId: string, data: UpdateStageData) {
    const stage = await this.repo.findStage(pipelineId, stageId);
    if (!stage) throw new NotFoundException('Etapa não encontrada');

    // Guard the "at least one active OPEN stage" invariant when this change
    // would take the stage out of the active-OPEN set.
    const leavesOpen =
      (data.isActive === false && stage.type === StageType.OPEN) ||
      (data.type !== undefined && data.type !== StageType.OPEN && stage.type === StageType.OPEN);
    if (leavesOpen) await this.assertNotLastOpen(pipelineId, stageId);

    return this.repo.updateStage(stageId, data);
  }

  async remove(pipelineId: string, stageId: string) {
    const stage = await this.repo.findStage(pipelineId, stageId);
    if (!stage) throw new NotFoundException('Etapa não encontrada');

    const opps = await this.repo.countOpportunitiesInStage(stageId);
    if (opps > 0) {
      throw new ConflictException('Etapa com oportunidades não pode ser excluída. Desative-a em vez disso.');
    }
    if (stage.type === StageType.OPEN) await this.assertNotLastOpen(pipelineId, stageId);

    await this.repo.removeStage(stageId);
  }

  async reorder(pipelineId: string, items: ReorderItem[]) {
    await this.assertPipeline(pipelineId);
    await this.repo.reorderStages(items);
  }

  private async assertPipeline(pipelineId: string) {
    const pipeline = await this.repo.findById(pipelineId);
    if (!pipeline) throw new NotFoundException('Funil não encontrado');
  }

  private async assertNotLastOpen(pipelineId: string, stageId: string) {
    const remaining = await this.repo.countActiveOpenStages(pipelineId, stageId);
    if (remaining === 0) {
      throw new ConflictException('O funil precisa manter ao menos uma etapa ativa do tipo OPEN');
    }
  }
}
