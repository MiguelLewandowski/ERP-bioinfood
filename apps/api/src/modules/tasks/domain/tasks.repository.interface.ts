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
  reorder(items: Array<{ id: string; order: number }>): Promise<void>;
  findAllDependenciesByProject(projectId: string): Promise<TaskDependencyEntity[]>;
  addDependency(predecessorId: string, successorId: string): Promise<TaskDependencyEntity>;
  removeDependency(id: string): Promise<void>;
  findDependency(id: string): Promise<TaskDependencyEntity | null>;
  // checklist
  addChecklistItem(taskId: string, text: string, order: number): Promise<TaskChecklistItemEntity>;
  updateChecklistItem(itemId: string, data: { text?: string; checked?: boolean }): Promise<TaskChecklistItemEntity>;
  deleteChecklistItem(itemId: string): Promise<void>;
  findChecklistItem(itemId: string): Promise<TaskChecklistItemEntity | null>;
}
