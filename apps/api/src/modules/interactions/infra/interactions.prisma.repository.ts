import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IInteractionRepository } from '../domain/interaction.repository';
import {
  CreateInteractionData,
  InteractionListItem,
  ListInteractionsFilter,
  UpdateInteractionData,
} from '../domain/interaction.entity';

const SELECT = {
  id: true,
  contactId: true,
  userId: true,
  opportunityId: true,
  type: true,
  direction: true,
  subject: true,
  summary: true,
  fullContent: true,
  interactionAt: true,
  createdAt: true,
  contact: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
} as const;

type Row = {
  interactionAt: Date;
  createdAt: Date;
} & Record<string, unknown>;

function toItem(row: Row): InteractionListItem {
  const { interactionAt, createdAt, ...rest } = row;
  return {
    ...(rest as unknown as Omit<InteractionListItem, 'interactionAt' | 'createdAt'>),
    interactionAt: interactionAt.toISOString(),
    createdAt: createdAt.toISOString(),
  };
}

@Injectable()
export class InteractionsPrismaRepository implements IInteractionRepository {
  constructor(private prisma: PrismaService) {}

  async findByOpportunity(opportunityId: string, filter: ListInteractionsFilter): Promise<InteractionListItem[]> {
    const rows = await this.prisma.interaction.findMany({
      where: {
        opportunityId,
        deletedAt: null,
        contactId: filter.contactId,
        type: filter.type,
        interactionAt: {
          gte: filter.from,
          lte: filter.to,
        },
      },
      select: SELECT,
      orderBy: { interactionAt: 'desc' },
      // Teto de 200: cliente escolhe o take, mas não dita o custo. Ver I2.
      take: Math.min(filter.take ?? 50, 200),
      skip: filter.skip ?? 0,
    });
    return rows.map((r) => toItem(r as Row));
  }

  async findById(id: string): Promise<InteractionListItem | null> {
    const row = await this.prisma.interaction.findFirst({ where: { id, deletedAt: null }, select: SELECT });
    return row ? toItem(row as Row) : null;
  }

  async findAuthorId(id: string): Promise<string | null | undefined> {
    const row = await this.prisma.interaction.findFirst({
      where: { id, deletedAt: null },
      select: { userId: true },
    });
    return row ? row.userId : undefined;
  }

  async create(data: CreateInteractionData): Promise<InteractionListItem> {
    const row = await this.prisma.interaction.create({ data, select: SELECT });
    return toItem(row as Row);
  }

  async update(id: string, data: UpdateInteractionData): Promise<InteractionListItem> {
    const row = await this.prisma.interaction.update({ where: { id }, data, select: SELECT });
    return toItem(row as Row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.interaction.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
