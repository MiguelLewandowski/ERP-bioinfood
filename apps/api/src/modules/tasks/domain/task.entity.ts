import { TaskStatus, TaskPriority } from '@prisma/client';

export interface TaskEntity {
  id: string;
  projectId: string;
  wbsNodeId: string | null;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number | null;
  startDate: Date | null;
  dueDate: Date | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TaskChecklistItemEntity {
  id: string;
  taskId: string;
  text: string;
  checked: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWithRelations extends TaskEntity {
  assignee: { id: string; name: string } | null;
  wbsNode: { id: string; code: string; title: string } | null;
  successors: Array<{ id: string; successorId: string }>;
  predecessors: Array<{ id: string; predecessorId: string }>;
  checklist: TaskChecklistItemEntity[];
}

export interface CreateTaskData {
  projectId: string;
  wbsNodeId?: string;
  assigneeId?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  storyPoints?: number;
  startDate?: Date;
  dueDate?: Date;
  order?: number;
}

export interface UpdateTaskData {
  wbsNodeId?: string | null;
  assigneeId?: string | null;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  storyPoints?: number | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  order?: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  assigneeId?: string;
  wbsNodeId?: string;
}
