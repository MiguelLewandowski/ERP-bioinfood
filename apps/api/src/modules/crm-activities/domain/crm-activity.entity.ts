import { ActivityStatus, ActivityType, TaskPriority } from '@prisma/client';

export interface CrmActivityListItem {
  id: string;
  orgId: string | null;
  contactId: string | null;
  interactionId: string | null;
  opportunityId: string | null;
  responsibleId: string | null;
  title: string;
  description: string | null;
  type: ActivityType;
  priority: TaskPriority;
  status: ActivityStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  organization: { id: string; legalName: string; tradeName: string | null } | null;
  contact: { id: string; name: string } | null;
  opportunity: { id: string; title: string } | null;
  responsible: { id: string; name: string } | null;
}

export interface CreateCrmActivityData {
  orgId?: string;
  contactId?: string;
  interactionId?: string;
  opportunityId?: string;
  responsibleId?: string;
  title: string;
  description?: string;
  type?: ActivityType;
  priority?: TaskPriority;
  dueDate?: Date;
}

export interface UpdateCrmActivityData {
  title?: string;
  description?: string | null;
  type?: ActivityType;
  priority?: TaskPriority;
  status?: ActivityStatus;
  responsibleId?: string | null;
  dueDate?: Date | null;
}

export type DueFilter = 'today' | 'overdue' | 'week';

export interface ListCrmActivitiesFilter {
  orgId?: string;
  opportunityId?: string;
  responsibleId?: string;
  due?: DueFilter;
  status?: ActivityStatus;
  take?: number;
}
