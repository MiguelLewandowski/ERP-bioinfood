import { InteractionDirection, InteractionType } from '@prisma/client';

export interface InteractionListItem {
  id: string;
  orgId: string;
  contactId: string | null;
  userId: string | null;
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

export interface CreateInteractionData {
  orgId: string;
  contactId?: string;
  userId?: string;
  type: InteractionType;
  direction?: InteractionDirection;
  subject?: string;
  summary?: string;
  fullContent?: string;
  interactionAt?: Date;
}

export interface UpdateInteractionData {
  contactId?: string | null;
  type?: InteractionType;
  direction?: InteractionDirection;
  subject?: string | null;
  summary?: string | null;
  fullContent?: string | null;
  interactionAt?: Date;
}

export interface ListInteractionsFilter {
  contactId?: string;
  type?: InteractionType;
  from?: Date;
  to?: Date;
  take?: number;
  skip?: number;
}
