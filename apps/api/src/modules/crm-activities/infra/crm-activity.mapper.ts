import { ActivityStatus, TaskPriority } from '@prisma/client';
import { CrmActivityListItem } from '../domain/crm-activity.entity';

export interface CrmActivityDto {
  id: string;
  orgId: string | null;
  contactId: string | null;
  interactionId: string | null;
  responsibleId: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: ActivityStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  organization: { id: string; legalName: string; tradeName: string | null } | null;
  contact: { id: string; name: string } | null;
  responsible: { id: string; name: string } | null;
}

// The domain list item is already a plain, safe projection.
export function toCrmActivityDto(item: CrmActivityListItem): CrmActivityDto {
  return item;
}
