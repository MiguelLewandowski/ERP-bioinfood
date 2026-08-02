import { InteractionDirection, InteractionType } from '@prisma/client';
import { InteractionListItem } from '../domain/interaction.entity';

export interface InteractionDto {
  id: string;
  contactId: string | null;
  userId: string | null;
  opportunityId: string;
  type: InteractionType;
  direction: InteractionDirection;
  subject: string | null;
  summary: string | null;
  fullContent: string | null;
  interactionAt: string;
  createdAt: string;
  contact: { id: string; name: string } | null;
  user: { id: string; name: string } | null;
}

// The domain list item is already a plain, safe projection.
export function toInteractionDto(item: InteractionListItem): InteractionDto {
  return item;
}
