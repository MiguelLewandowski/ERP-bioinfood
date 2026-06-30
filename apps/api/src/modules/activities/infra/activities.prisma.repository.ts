import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IActivitiesRepository } from '../domain/activities.repository.interface';
import { ActivityFilters, ActivityListItem } from '../domain/activity.entity';

@Injectable()
export class ActivitiesPrismaRepository implements IActivitiesRepository {
  constructor(private prisma: PrismaService) {}

  async findAllInRange(filters: ActivityFilters): Promise<ActivityListItem[]> {
    const { from, to, projectIds } = filters;

    // Data-âncora: startDate quando existe, senão dueDate (mesma regra de
    // `taskAnchorDate` em @bioinfood/shared, aqui expressa em SQL).
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = from;
    if (to) range.lte = to;
    const hasRange = from !== undefined || to !== undefined;

    const dateCondition: Prisma.TaskWhereInput[] = hasRange
      ? [
          { startDate: range },
          { AND: [{ startDate: null }, { dueDate: range }] },
        ]
      : [{ startDate: { not: null } }, { dueDate: { not: null } }];

    const tasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(projectIds && { projectId: { in: projectIds } }),
        OR: dateCondition,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        startDate: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        // Antecessoras: tasks das quais esta depende (esta é a sucessora).
        predecessors: {
          select: {
            predecessor: { select: { id: true, title: true, status: true } },
          },
        },
      },
      orderBy: [{ startDate: 'asc' }, { dueDate: 'asc' }],
      take: 500,
    });

    return tasks.map((task) => ({
      ...task,
      predecessors: task.predecessors.map((dep) => dep.predecessor),
    })) as ActivityListItem[];
  }

  async findAccessibleProjectIds(userId: string): Promise<string[]> {
    const accesses = await this.prisma.projectAccess.findMany({
      where: { userId },
      select: { projectId: true },
    });
    return accesses.map((a) => a.projectId);
  }
}
