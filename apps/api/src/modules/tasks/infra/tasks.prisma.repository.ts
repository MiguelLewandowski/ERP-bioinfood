import { Injectable, ConflictException } from '@nestjs/common';
import { Prisma, TaskDependencyType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ITaskRepository } from '../domain/tasks.repository.interface';
import { CreateTaskData, TaskChecklistItemEntity, TaskFilters, TaskWithRelations, UpdateTaskData } from '../domain/task.entity';
import { TaskDependencyEntity } from '../domain/task-dependency.entity';

const WITH_RELATIONS = {
  assignee: { select: { id: true, name: true } },
  wbsNode: { select: { id: true, code: true, title: true } },
  successors: { select: { id: true, successorId: true, type: true, lag: true } },
  predecessors: { select: { id: true, predecessorId: true, type: true, lag: true } },
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

  async findIncompletePredecessors(taskId: string): Promise<Array<{ id: string; title: string }>> {
    const deps = await this.prisma.taskDependency.findMany({
      where: {
        successorId: taskId,
        predecessor: { deletedAt: null, status: { not: 'DONE' } },
      },
      select: { predecessor: { select: { id: true, title: true } } },
    });
    return deps.map((d) => d.predecessor);
  }

  async addDependency(
    predecessorId: string,
    successorId: string,
    type: TaskDependencyType = TaskDependencyType.FS,
    lag = 0,
  ): Promise<TaskDependencyEntity> {
    try {
      return await this.prisma.taskDependency.create({
        data: { predecessorId, successorId, type, lag },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Já existe uma dependência entre essas tarefas');
      }
      throw err;
    }
  }

  async removeDependency(id: string): Promise<void> {
    // Idempotente: se já não existe (ex.: link efêmero da UI que nunca chegou
    // a persistir), o objetivo do chamador — o vínculo não existir — já foi
    // alcançado, então não é um erro.
    await this.prisma.taskDependency.deleteMany({ where: { id } });
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
