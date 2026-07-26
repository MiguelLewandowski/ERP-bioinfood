import { Injectable } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IActivitiesRepository } from '../domain/activities.repository.interface';
import { ActivityFilters, ActivityListItem } from '../domain/activity.entity';

@Injectable()
export class ActivitiesPrismaRepository implements IActivitiesRepository {
  constructor(private prisma: PrismaService) {}

  async findAllInRange(filters: ActivityFilters): Promise<ActivityListItem[]> {
    const { from, to, projectIds } = filters;

    // Sobreposição de intervalo: a atividade entra se seu intervalo
    // [startDate, dueDate] cruza [from, to]. Quando só há uma das datas, ela
    // ocupa um único dia (mesma âncora de `taskAnchorDate` em @bioinfood/shared).
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = from;
    if (to) range.lte = to;
    const hasRange = from !== undefined || to !== undefined;

    const dateCondition: Prisma.TaskWhereInput[] = hasRange
      ? [
          // tem as duas datas: intervalos se sobrepõem
          {
            AND: [
              ...(to ? [{ startDate: { lte: to } }] : []),
              ...(from ? [{ dueDate: { gte: from } }] : []),
            ],
          },
          // só startDate: cai no range
          { AND: [{ dueDate: null }, { startDate: range }] },
          // só dueDate: cai no range
          { AND: [{ startDate: null }, { dueDate: range }] },
        ]
      : [{ startDate: { not: null } }, { dueDate: { not: null } }];

    const tasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        project: { status: { not: ProjectStatus.CANCELLED } },
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
