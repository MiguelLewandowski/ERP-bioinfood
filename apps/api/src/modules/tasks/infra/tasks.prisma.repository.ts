import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ITaskRepository } from '../domain/tasks.repository.interface';
import { CreateTaskData, TaskChecklistItemEntity, TaskFilters, TaskWithRelations, UpdateTaskData } from '../domain/task.entity';
import { TaskDependencyEntity } from '../domain/task-dependency.entity';

const WITH_RELATIONS = {
  assignee: { select: { id: true, name: true } },
  wbsNode: { select: { id: true, code: true, title: true } },
  successors: { select: { id: true, successorId: true } },
  predecessors: { select: { id: true, predecessorId: true } },
  checklist: { orderBy: { order: 'asc' as const } },
} as const;

@Injectable()
export class TasksPrismaRepository implements ITaskRepository {
  constructor(private prisma: PrismaService) {}

  findAllByProject(projectId: string, filters: TaskFilters): Promise<TaskWithRelations[]> {
    return this.prisma.task.findMany({
      where: {
        projectId,
        deletedAt: null,
        ...(filters.status && { status: filters.status }),
        ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters.wbsNodeId && { wbsNodeId: filters.wbsNodeId }),
      },
      include: WITH_RELATIONS,
      orderBy: { order: 'asc' },
      take: 100,
    }) as Promise<TaskWithRelations[]>;
  }

  findById(id: string): Promise<TaskWithRelations | null> {
    return this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: WITH_RELATIONS,
    }) as Promise<TaskWithRelations | null>;
  }

  create(data: CreateTaskData): Promise<TaskWithRelations> {
    return this.prisma.task.create({
      data,
      include: WITH_RELATIONS,
    }) as Promise<TaskWithRelations>;
  }

  update(id: string, data: UpdateTaskData): Promise<TaskWithRelations> {
    return this.prisma.task.update({
      where: { id },
      data,
      include: WITH_RELATIONS,
    }) as Promise<TaskWithRelations>;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async reorder(items: Array<{ id: string; order: number }>): Promise<void> {
    await this.prisma.$transaction(
      items.map(({ id, order }) =>
        this.prisma.task.update({ where: { id }, data: { order } }),
      ),
    );
  }

  findAllDependenciesByProject(projectId: string): Promise<TaskDependencyEntity[]> {
    return this.prisma.taskDependency.findMany({
      where: {
        predecessor: { projectId, deletedAt: null },
      },
      take: 500,
    });
  }

  addDependency(predecessorId: string, successorId: string): Promise<TaskDependencyEntity> {
    return this.prisma.taskDependency.create({
      data: { predecessorId, successorId },
    });
  }

  async removeDependency(id: string): Promise<void> {
    await this.prisma.taskDependency.delete({ where: { id } });
  }

  findDependency(id: string): Promise<TaskDependencyEntity | null> {
    return this.prisma.taskDependency.findUnique({ where: { id } });
  }

  addChecklistItem(taskId: string, text: string, order: number): Promise<TaskChecklistItemEntity> {
    return this.prisma.taskChecklistItem.create({ data: { taskId, text, order } });
  }

  updateChecklistItem(itemId: string, data: { text?: string; checked?: boolean }): Promise<TaskChecklistItemEntity> {
    return this.prisma.taskChecklistItem.update({ where: { id: itemId }, data });
  }

  async deleteChecklistItem(itemId: string): Promise<void> {
    await this.prisma.taskChecklistItem.delete({ where: { id: itemId } });
  }

  findChecklistItem(itemId: string): Promise<TaskChecklistItemEntity | null> {
    return this.prisma.taskChecklistItem.findUnique({ where: { id: itemId } });
  }
}
