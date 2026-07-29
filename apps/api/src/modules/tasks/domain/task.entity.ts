import { TaskStatus, TaskPriority, TaskDependencyType } from '@prisma/client';

export interface TaskEntity {
  id: string;
  projectId: string;
  wbsNodeId: string | null;
  parentId: string | null;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number | null;
  /** Se a tarefa exige POP. Falso = administrativa, sai do denominador da cobertura. */
  requiresSOP: boolean;
  startDate: Date | null;
  dueDate: Date | null;
  baselineStart: Date | null;
  baselineEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
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

export interface TaskPopUsageEntity {
  id: string;
  taskId: string;
  popVersionId: string;
  addedById: string;
  createdAt: Date;
  addedBy: { id: string; name: string };
  popVersion: {
    id: string;
    versionNumber: number;
    pop: { id: string; title: string };
  };
}

export interface TaskWithRelations extends TaskEntity {
  assignee: { id: string; name: string } | null;
  /** Quem divide a tarefa com o `assignee` (responsável principal). */
  coAssignees: Array<{ user: { id: string; name: string } }>;
  wbsNode: { id: string; code: string; title: string } | null;
  successors: Array<{ id: string; successorId: string; type: TaskDependencyType; lag: number }>;
  predecessors: Array<{ id: string; predecessorId: string; type: TaskDependencyType; lag: number }>;
  checklist: TaskChecklistItemEntity[];
  pops: TaskPopUsageEntity[];
}

export interface CreateTaskData {
  projectId: string;
  wbsNodeId?: string;
  parentId?: string | null;
  assigneeId?: string;
  /** Corresponsáveis, além do principal. */
  coAssigneeIds?: string[];
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  storyPoints?: number;
  requiresSOP?: boolean;
  startDate?: Date;
  dueDate?: Date;
  order?: number;
}

export interface UpdateTaskData {
  wbsNodeId?: string | null;
  parentId?: string | null;
  assigneeId?: string | null;
  /** Substitui a lista inteira quando presente; ausente = não mexe. */
  coAssigneeIds?: string[];
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  storyPoints?: number | null;
  requiresSOP?: boolean;
  startDate?: Date | null;
  dueDate?: Date | null;
  actualStart?: Date | null;
  actualEnd?: Date | null;
  order?: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  assigneeId?: string;
  wbsNodeId?: string;
}
