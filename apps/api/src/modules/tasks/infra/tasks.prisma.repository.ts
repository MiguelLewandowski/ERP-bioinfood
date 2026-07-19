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

  async reorder(projectId: string, items: Array<{ id: string; order: number }>): Promise<void> {
    // updateMany com projectId no where: uma task de outro projeto simplesmente
    // não casa e é ignorada — nunca reordena item fora do projeto da URL.
    await this.prisma.$transaction(
      items.map(({ id, order }) =>
        this.prisma.task.updateMany({ where: { id, projectId }, data: { order } }),
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

  async removeDependency(projectId: string, id: string): Promise<void> {
    // Idempotente E escopado: só apaga se a dependência pertencer a uma task
    // predecessora do projeto da URL. Link de outro projeto (ou já inexistente)
    // não casa e vira no-op — sem erro, sem IDOR.
    await this.prisma.taskDependency.deleteMany({
      where: { id, predecessor: { projectId } },
    });
  }

  addChecklistItem(taskId: string, text: string, order: number): Promise<TaskChecklistItemEntity> {
    return this.prisma.taskChecklistItem.create({ data: { taskId, text, order } });
  }

  async updateChecklistItem(
    projectId: string,
    itemId: string,
    data: { text?: string; checked?: boolean },
  ): Promise<TaskChecklistItemEntity> {
    // updateMany escopado pelo projeto da task dona; se não casar, count=0 e a
    // busca subsequente devolve null → o use-case lança NotFound.
    await this.prisma.taskChecklistItem.updateMany({
      where: { id: itemId, task: { projectId } },
      data,
    });
    return this.prisma.taskChecklistItem.findFirstOrThrow({
      where: { id: itemId, task: { projectId } },
    });
  }

  async deleteChecklistItem(projectId: string, itemId: string): Promise<void> {
    await this.prisma.taskChecklistItem.deleteMany({
      where: { id: itemId, task: { projectId } },
    });
  }

  findChecklistItem(projectId: string, itemId: string): Promise<TaskChecklistItemEntity | null> {
    return this.prisma.taskChecklistItem.findFirst({
      where: { id: itemId, task: { projectId } },
    });
  }
}
