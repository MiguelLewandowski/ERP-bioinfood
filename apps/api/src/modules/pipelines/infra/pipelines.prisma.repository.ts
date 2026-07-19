import { Injectable } from '@nestjs/common';
import { StageType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IPipelineRepository } from '../domain/pipeline.repository';
import {
  CreatePipelineData,
  CreateStageData,
  Pipeline,
  PipelineStageItem,
  PipelineSummary,
  ReorderItem,
  UpdatePipelineData,
  UpdateStageData,
} from '../domain/pipeline.entity';

const STAGE_SELECT = {
  id: true, name: true, type: true, probability: true, color: true, order: true, isActive: true,
} as const;

const PIPELINE_SELECT = {
  id: true, name: true, abbreviation: true, isDefault: true, isActive: true, order: true,
  stages: { select: STAGE_SELECT, orderBy: { order: 'asc' } },
} as const;

@Injectable()
export class PipelinesPrismaRepository implements IPipelineRepository {
  constructor(private prisma: PrismaService) {}

  findAll(): Promise<Pipeline[]> {
    return this.prisma.pipeline.findMany({
      where: { deletedAt: null },
      select: PIPELINE_SELECT,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      take: 100,
    });
  }

  findById(id: string): Promise<Pipeline | null> {
    return this.prisma.pipeline.findFirst({ where: { id, deletedAt: null }, select: PIPELINE_SELECT });
  }

  create(data: CreatePipelineData): Promise<Pipeline> {
    return this.prisma.pipeline.create({
      data: {
        name: data.name,
        abbreviation: data.abbreviation,
        isDefault: data.isDefault ?? false,
        stages: data.stages
          ? { create: data.stages.map((s, i) => ({ ...s, order: s.order ?? i })) }
          : undefined,
      },
      select: PIPELINE_SELECT,
    });
  }

  update(id: string, data: UpdatePipelineData): Promise<Pipeline> {
    return this.prisma.pipeline.update({ where: { id }, data, select: PIPELINE_SELECT });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.pipeline.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async clearDefaultExcept(id: string): Promise<void> {
    await this.prisma.pipeline.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  countPipelines(): Promise<number> {
    return this.prisma.pipeline.count({ where: { deletedAt: null } });
  }

  findStage(pipelineId: string, stageId: string): Promise<PipelineStageItem | null> {
    return this.prisma.pipelineStage.findFirst({ where: { id: stageId, pipelineId }, select: STAGE_SELECT });
  }

  addStage(pipelineId: string, data: CreateStageData): Promise<PipelineStageItem> {
    return this.prisma.pipelineStage.create({ data: { pipelineId, ...data }, select: STAGE_SELECT });
  }

  updateStage(stageId: string, data: UpdateStageData): Promise<PipelineStageItem> {
    return this.prisma.pipelineStage.update({ where: { id: stageId }, data, select: STAGE_SELECT });
  }

  async removeStage(stageId: string): Promise<void> {
    await this.prisma.pipelineStage.delete({ where: { id: stageId } });
  }

  async reorderStages(items: ReorderItem[]): Promise<void> {
    await this.prisma.$transaction(
      items.map((i) => this.prisma.pipelineStage.update({ where: { id: i.id }, data: { order: i.order } })),
    );
  }

  countActiveOpenStages(pipelineId: string, excludeStageId?: string): Promise<number> {
    return this.prisma.pipelineStage.count({
      where: {
        pipelineId,
        type: StageType.OPEN,
        isActive: true,
        id: excludeStageId ? { not: excludeStageId } : undefined,
      },
    });
  }

  countOpportunitiesInStage(stageId: string): Promise<number> {
    return this.prisma.opportunity.count({ where: { stageId, deletedAt: null } });
  }

  async summary(pipelineId: string): Promise<PipelineSummary> {
    const stages = await this.prisma.pipelineStage.findMany({
      where: { pipelineId },
      select: { id: true, name: true, type: true },
      orderBy: { order: 'asc' },
    });
    const opps = await this.prisma.opportunity.findMany({
      where: { pipelineId, deletedAt: null },
      select: { stageId: true, amount: true, probability: true },
      take: 5000,
    });

    const typeByStage = new Map(stages.map((s) => [s.id, s.type]));
    const perStage = new Map<string, { count: number; amount: number }>();
    let openTotal = 0;
    let weightedTotal = 0;
    let wonCount = 0;
    let lostCount = 0;

    for (const o of opps) {
      const amount = o.amount ? Number(o.amount) : 0;
      const acc = perStage.get(o.stageId) ?? { count: 0, amount: 0 };
      acc.count += 1;
      acc.amount += amount;
      perStage.set(o.stageId, acc);

      const type = typeByStage.get(o.stageId);
      if (type === StageType.WON) wonCount += 1;
      else if (type === StageType.LOST) lostCount += 1;
      else {
        openTotal += amount;
        weightedTotal += amount * ((o.probability ?? 0) / 100);
      }
    }

    const closed = wonCount + lostCount;
    return {
      stages: stages.map((s) => {
        const acc = perStage.get(s.id) ?? { count: 0, amount: 0 };
        return { stageId: s.id, name: s.name, type: s.type, count: acc.count, amount: acc.amount.toFixed(2) };
      }),
      openTotal: openTotal.toFixed(2),
      weightedTotal: weightedTotal.toFixed(2),
      wonCount,
      lostCount,
      conversionRate: closed === 0 ? 0 : wonCount / closed,
    };
  }
}
