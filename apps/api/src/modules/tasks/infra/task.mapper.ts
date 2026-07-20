import { TaskDependencyType, TaskPriority, TaskStatus } from '@prisma/client';
import { TaskWithRelations } from '../domain/task.entity';

export interface TaskChecklistItemDto {
  id: string;
  taskId: string;
  text: string;
  checked: boolean;
  order: number;
}

export interface TaskPopUsageDto {
  id: string;
  popVersionId: string;
  addedBy: { id: string; name: string };
  pop: { id: string; title: string };
  versionNumber: number;
  createdAt: Date;
}

export interface TaskDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number | null;
  order: number;
  parentId: string | null;
  assignee: { id: string; name: string } | null;
  wbsNode: { id: string; code: string; title: string } | null;
  startDate: Date | null;
  dueDate: Date | null;
  baselineStart: Date | null;
  baselineEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  predecessors: Array<{ id: string; predecessorId: string; type: TaskDependencyType; lag: number }>;
  successors: Array<{ id: string; successorId: string; type: TaskDependencyType; lag: number }>;
  checklist: TaskChecklistItemDto[];
  pops: TaskPopUsageDto[];
  deletedAt: Date | null;
}

export function toTaskDto(t: TaskWithRelations): TaskDto {
  return {
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    storyPoints: t.storyPoints,
    order: t.order,
    parentId: t.parentId,
    assignee: t.assignee,
    wbsNode: t.wbsNode,
    startDate: t.startDate,
    dueDate: t.dueDate,
    baselineStart: t.baselineStart,
    baselineEnd: t.baselineEnd,
    actualStart: t.actualStart,
    actualEnd: t.actualEnd,
    predecessors: t.predecessors,
    successors: t.successors,
    checklist: t.checklist.map((c) => ({
      id: c.id,
      taskId: c.taskId,
      text: c.text,
      checked: c.checked,
      order: c.order,
    })),
    pops: t.pops.map((p) => ({
      id: p.id,
      popVersionId: p.popVersionId,
      addedBy: p.addedBy,
      pop: p.popVersion.pop,
      versionNumber: p.popVersion.versionNumber,
      createdAt: p.createdAt,
    })),
    deletedAt: t.deletedAt,
  };
}
