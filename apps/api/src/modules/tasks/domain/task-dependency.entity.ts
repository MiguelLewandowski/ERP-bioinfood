export interface TaskDependencyEntity {
  id: string;
  predecessorId: string;
  successorId: string;
  createdAt: Date;
}
