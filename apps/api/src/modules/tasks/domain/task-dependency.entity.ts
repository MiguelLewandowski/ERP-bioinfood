import { TaskDependencyType } from '@prisma/client';

export interface TaskDependencyEntity {
  id: string;
  predecessorId: string;
  successorId: string;
  type: TaskDependencyType;
  lag: number;
  createdAt: Date;
}
