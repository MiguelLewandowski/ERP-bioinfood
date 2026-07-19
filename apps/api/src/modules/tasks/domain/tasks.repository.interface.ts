import { TaskDependencyType } from '@prisma/client';
import { TaskDependencyEntity } from './task-dependency.entity';
import {
  CreateTaskData,
  TaskChecklistItemEntity,
  TaskFilters,
  TaskWithRelations,
  UpdateTaskData,
} from './task.entity';

export const TASK_REPOSITORY = 'TASK_REPOSITORY';

export interface ITaskRepository {
  findAllByProject(projectId: string, filters: TaskFilters): Promise<TaskWithRelations[]>;
  findById(id: string): Promise<TaskWithRelations | null>;
  create(data: CreateTaskData): Promise<TaskWithRelations>;
  update(id: string, data: UpdateTaskData): Promise<TaskWithRelations>;
  softDelete(id: string): Promise<void>;
  // projectId escopa o lote: itens de outro projeto são ignorados (anti-IDOR).
  reorder(projectId: string, items: Array<{ id: string; order: number }>): Promise<void>;
  findAllDependenciesByProject(projectId: string): Promise<TaskDependencyEntity[]>;
  // Antecessoras (predecessoras) desta task que ainda não foram concluídas.
  findIncompletePredecessors(taskId: string): Promise<Array<{ id: string; title: string }>>;
  addDependency(
    predecessorId: string,
    successorId: string,
    type?: TaskDependencyType,
    lag?: number,
  ): Promise<TaskDependencyEntity>;
  // projectId escopa a exclusão pelo projeto da task predecessora (anti-IDOR).
  removeDependency(projectId: string, id: string): Promise<void>;
  // checklist — todas as operações escopadas pelo projeto da task dona do item.
  addChecklistItem(taskId: string, text: string, order: number): Promise<TaskChecklistItemEntity>;
  updateChecklistItem(projectId: string, itemId: string, data: { text?: string; checked?: boolean }): Promise<TaskChecklistItemEntity>;
  deleteChecklistItem(projectId: string, itemId: string): Promise<void>;
  findChecklistItem(projectId: string, itemId: string): Promise<TaskChecklistItemEntity | null>;
}
