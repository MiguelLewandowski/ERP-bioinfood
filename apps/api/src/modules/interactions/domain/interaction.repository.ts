import {
  CreateInteractionData,
  InteractionListItem,
  ListInteractionsFilter,
  UpdateInteractionData,
} from './interaction.entity';

export const INTERACTION_REPOSITORY = 'INTERACTION_REPOSITORY';

export interface IInteractionRepository {
  findByOpportunity(opportunityId: string, filter: ListInteractionsFilter): Promise<InteractionListItem[]>;
  findById(id: string): Promise<InteractionListItem | null>;
  // undefined = registro não encontrado; null = encontrado mas sem autor definido.
  findAuthorId(id: string): Promise<string | null | undefined>;
  create(data: CreateInteractionData): Promise<InteractionListItem>;
  update(id: string, data: UpdateInteractionData): Promise<InteractionListItem>;
  softDelete(id: string): Promise<void>;
}
