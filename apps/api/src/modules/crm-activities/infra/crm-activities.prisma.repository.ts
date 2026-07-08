import { Injectable } from '@nestjs/common';
import { ActivityStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICrmActivityRepository } from '../domain/crm-activity.repository';
import {
  CreateCrmActivityData,
  CrmActivityListItem,
  ListCrmActivitiesFilter,
  UpdateCrmActivityData,
} from '../domain/crm-activity.entity';

const SELECT = {
  id: true,
  orgId: true,
  contactId: true,
  interactionId: true,
  responsibleId: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  organization: { select: { id: true, legalName: true, tradeName: true } },
  contact: { select: { id: true, name: true } },
  responsible: { select: { id: true, name: true } },
} as const;

type Row = {
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
} & Record<string, unknown>;

function toItem(row: Row): CrmActivityListItem {
  const { dueDate, completedAt, createdAt, ...rest } = row;
  return {
    ...(rest as unknown as Omit<CrmActivityListItem, 'dueDate' | 'completedAt' | 'createdAt'>),
    dueDate: dueDate?.toISOString() ?? null,
    completedAt: completedAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
  };
}

// due=today: vence hoje; overdue: venceu e ainda não fechou; week: vence nos
// próximos 7 dias. Sempre exclui DONE/CANCELLED — é lista de pendências.
function dueWhere(due: ListCrmActivitiesFilter['due']): Prisma.ActivityWhereInput {
  if (!due) return {};
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const openStatus = { notIn: [ActivityStatus.DONE, ActivityStatus.CANCELLED] };

  if (due === 'today') {
    return { dueDate: { gte: startOfToday, lt: endOfToday }, status: openStatus };
  }
  if (due === 'overdue') {
    return { dueDate: { lt: startOfToday }, status: openStatus };
  }
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  return { dueDate: { gte: startOfToday, lt: endOfWeek }, status: openStatus };
}

@Injectable()
export class CrmActivitiesPrismaRepository implements ICrmActivityRepository {
  constructor(private prisma: PrismaService) {}

  async list(filter: ListCrmActivitiesFilter): Promise<CrmActivityListItem[]> {
    const rows = await this.prisma.activity.findMany({
      where: {
        orgId: filter.orgId,
        responsibleId: filter.responsibleId,
        status: filter.status,
        ...dueWhere(filter.due),
      },
      select: SELECT,
      orderBy: { dueDate: 'asc' },
      take: filter.take ?? 200,
    });
    return rows.map((r) => toItem(r as Row));
  }

  async findById(id: string): Promise<CrmActivityListItem | null> {
    const row = await this.prisma.activity.findUnique({ where: { id }, select: SELECT });
    return row ? toItem(row as Row) : null;
  }

  async create(data: CreateCrmActivityData): Promise<CrmActivityListItem> {
    const row = await this.prisma.activity.create({ data, select: SELECT });
    return toItem(row as Row);
  }

  async update(
    id: string,
    data: UpdateCrmActivityData & { completedAt?: Date | null },
  ): Promise<CrmActivityListItem> {
    const row = await this.prisma.activity.update({ where: { id }, data, select: SELECT });
    return toItem(row as Row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.activity.delete({ where: { id } });
  }
}
