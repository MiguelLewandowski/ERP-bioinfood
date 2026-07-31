/**
 * Cadastro de estoque — deliberadamente básico: o que a Bioinfood TEM e usa
 * nos projetos. Sem movimentação, saldo, reserva ou agenda de uso.
 *
 * A categoria é dado, não enum: nasce só com "Equipamento" e cresce pela tela
 * de configuração. Por isso nada no código pergunta "é equipamento?" — se
 * perguntasse, cadastrar "Insumo" exigiria mexer em código.
 */

/** Situação do item no cadastro. String, como já é o padrão do projeto. */
export const STOCK_ITEM_STATUSES = ['ACTIVE', 'MAINTENANCE', 'RETIRED'] as const;
export type StockItemStatus = (typeof STOCK_ITEM_STATUSES)[number];

export interface StockCategoryEntity {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

export interface StockItemEntity {
  id: string;
  name: string;
  code: string | null;
  categoryId: string;
  category: { id: string; name: string };
  quantity: number;
  unit: string | null;
  location: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStockItemData {
  name: string;
  code?: string | null;
  categoryId: string;
  quantity?: number;
  unit?: string | null;
  location?: string | null;
  status?: string;
  notes?: string | null;
}

export type UpdateStockItemData = Partial<CreateStockItemData>;
