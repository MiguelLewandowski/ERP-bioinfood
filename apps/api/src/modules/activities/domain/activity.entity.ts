import { SystemRole, TaskStatus, TaskPriority } from '@prisma/client';

export interface ActivityPredecessor {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface ActivityListItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: Date | null;
  dueDate: Date | null;
  project: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  predecessors: ActivityPredecessor[];
}

export interface ActivityFilters {
  from?: Date;
  to?: Date;
  // Quando definido, restringe a busca a estes projetos (usado para CLIENTE).
  projectIds?: string[];
}

export interface ActivityRequester {
  id: string;
  role: SystemRole;
}
