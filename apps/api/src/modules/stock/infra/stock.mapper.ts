import type { StockCategoryDto, StockItemDto } from '@bioinfood/shared';
import { StockCategoryEntity, StockItemEntity } from '../domain/stock.entity';

/**
 * Contrato de fronteira anotado nos dois lados (CLAUDE.md): o retorno é tipado
 * com o DTO de `@bioinfood/shared`, o mesmo que o web consome. Divergir daqui
 * vira erro de build, não bug em produção.
 *
 * `Date` sai serializada como string ISO pelo Nest — daí o cast das datas.
 */
export function toStockItemDto(item: StockItemEntity): StockItemDto {
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    category: item.category,
    categoryId: item.categoryId,
    quantity: item.quantity,
    unit: item.unit,
    location: item.location,
    status: item.status,
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toStockCategoryDto(category: StockCategoryEntity): StockCategoryDto {
  return {
    id: category.id,
    name: category.name,
    isActive: category.isActive,
    order: category.order,
  };
}
