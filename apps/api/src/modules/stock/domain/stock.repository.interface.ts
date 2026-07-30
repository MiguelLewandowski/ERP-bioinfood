import {
  CreateStockItemData,
  StockCategoryEntity,
  StockItemEntity,
  UpdateStockItemData,
} from './stock.entity';

export const STOCK_REPOSITORY = 'STOCK_REPOSITORY';

export interface StockItemFilter {
  /** Busca por nome, código ou localização, sem distinção de maiúsculas. */
  search?: string;
  categoryId?: string;
  status?: string;
}

export interface IStockRepository {
  findItems(filter?: StockItemFilter): Promise<StockItemEntity[]>;
  findItemById(id: string): Promise<StockItemEntity | null>;
  createItem(data: CreateStockItemData): Promise<StockItemEntity>;
  updateItem(id: string, data: UpdateStockItemData): Promise<StockItemEntity>;
  softDeleteItem(id: string): Promise<void>;
  /** Quantos TAPs já referenciam este item — bloqueia exclusão silenciosa. */
  countCharterLinks(itemId: string): Promise<number>;

  findCategories(): Promise<StockCategoryEntity[]>;
  categoryExists(id: string): Promise<boolean>;
  createCategory(name: string): Promise<StockCategoryEntity>;
  updateCategory(
    id: string,
    data: { name?: string; isActive?: boolean },
  ): Promise<StockCategoryEntity>;
  countItemsInCategory(categoryId: string): Promise<number>;
  deleteCategory(id: string): Promise<void>;
}
