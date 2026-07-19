import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IOpportunityRepository, MoveData } from '../domain/opportunity.repository';
import {
  CreateOpportunityData,
  OpportunityListItem,
  ReorderItem,
  StageRef,
  UpdateOpportunityData,
} from '../domain/opportunity.entity';

const SELECT = {
  id: true,
  title: true,
  amount: true,
  currency: true,
  probability: true,
  pipelineId: true,
  stageId: true,
  startDate: true,
  description: true,
  expectedCloseDate: true,
  closedAt: true,
  frozenAt: true,
  order: true,
  engagementStageId: true,
  organization: { select: { id: true, legalName: true, tradeName: true } },
  mainContact: { select: { id: true, name: true } },
  responsible: { select: { id: true, name: true } },
  pipeline: { select: { id: true, name: true } },
  stage: { select: { id: true, name: true, type: true } },
} as const;

type Row = {
  amount: { toString(): string } | null;
  startDate: Date | null;
  expectedCloseDate: Date | null;
  closedAt: Date | null;
  frozenAt: Date | null;
} & Record<string, unknown>;

type DateKeys = 'amount' | 'startDate' | 'expectedCloseDate' | 'closedAt' | 'frozenAt';

function toItem(row: Row): OpportunityListItem {
  const {
    amount, startDate, expectedCloseDate, closedAt, frozenAt, ...rest
  } = row;
  return {
    ...(rest as unknown as Omit<OpportunityListItem, DateKeys>),
    amount: amount?.toString() ?? null,
    startDate: startDate?.toISOString() ?? null,
    expectedCloseDate: expectedCloseDate?.toISOString() ?? null,
    closedAt: closedAt?.toISOString() ?? null,
    frozenAt: frozenAt?.toISOString() ?? null,
  };
}

@Injectable()
export class OpportunitiesPrismaRepository implements IOpportunityRepository {
  constructor(private prisma: PrismaService) {}

  async findByPipeline(pipelineId: string): Promise<OpportunityListItem[]> {
    const rows = await this.prisma.opportunity.findMany({
      where: { pipelineId, deletedAt: null },
      select: SELECT,
      orderBy: [{ stageId: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
      take: 1000,
    });
    return rows.map((r) => toItem(r as Row));
  }

  async findByOrg(orgId: string): Promise<OpportunityListItem[]> {
    const rows = await this.prisma.opportunity.findMany({
      where: { orgId, deletedAt: null },
      select: SELECT,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => toItem(r as Row));
  }

  async findById(id: string): Promise<OpportunityListItem | null> {
    const row = await this.prisma.opportunity.findFirst({ where: { id, deletedAt: null }, select: SELECT });
    return row ? toItem(row as Row) : null;
  }

  async create(data: CreateOpportunityData): Promise<OpportunityListItem> {
    const row = await this.prisma.opportunity.create({ data, select: SELECT });
    return toItem(row as Row);
  }

  async update(id: string, data: UpdateOpportunityData): Promise<OpportunityListItem> {
    const row = await this.prisma.opportunity.update({ where: { id }, data, select: SELECT });
    return toItem(row as Row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.opportunity.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async move(id: string, data: MoveData): Promise<OpportunityListItem> {
    const row = await this.prisma.opportunity.update({
      where: { id },
      data: {
        stageId: data.stageId,
        probability: data.probability,
        closedAt: data.closedAt,
        lostReason: data.lostReason,
      },
      select: SELECT,
    });
    return toItem(row as Row);
  }

  async reorder(stageId: string, items: ReorderItem[]): Promise<void> {
    // where inclui stageId — um item que não pertence a esta etapa é
    // silenciosamente ignorado (anti-IDOR: nunca reordena card de outra etapa).
    await this.prisma.$transaction(
      items.map((i) => this.prisma.opportunity.updateMany({
        where: { id: i.id, stageId },
        data: { order: i.order },
      })),
    );
  }

  findStageRef(stageId: string): Promise<StageRef | null> {
    return this.prisma.pipelineStage.findUnique({
      where: { id: stageId },
      select: { id: true, pipelineId: true, type: true, probability: true },
    });
  }
}
