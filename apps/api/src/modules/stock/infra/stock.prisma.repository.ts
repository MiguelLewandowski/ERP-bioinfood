import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  IStockRepository,
  StockItemFilter,
} from '../domain/stock.repository.interface';
import {
  CreateStockItemData,
  StockCategoryEntity,
  StockItemEntity,
  UpdateStockItemData,
} from '../domain/stock.entity';

const CATEGORY = { select: { id: true, name: true } } as const;

@Injectable()
export class StockPrismaRepository implements IStockRepository {
  constructor(private prisma: PrismaService) {}

  async findItems(filter: StockItemFilter = {}): Promise<StockItemEntity[]> {
    const search = filter.search?.trim();
    const rows = await this.prisma.stockItem.findMany({
      where: {
        deletedAt: null,
        ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { code: { contains: search, mode: 'insensitive' as const } },
                { location: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { category: CATEGORY },
      // Agrupado por categoria na tela — ordenar aqui evita reordenar no client.
      orderBy: [{ category: { order: 'asc' } }, { category: { name: 'asc' } }, { name: 'asc' }],
      take: 500,
    });
    return rows as StockItemEntity[];
  }

  async findItemById(id: string): Promise<StockItemEntity | null> {
    const row = await this.prisma.stockItem.findFirst({
      where: { id, deletedAt: null },
      include: { category: CATEGORY },
    });
    return row as StockItemEntity | null;
  }

  async createItem(data: CreateStockItemData): Promise<StockItemEntity> {
    const row = await this.prisma.stockItem.create({
      data: {
        name: data.name,
        code: data.code ?? null,
        categoryId: data.categoryId,
        quantity: data.quantity ?? 1,
        unit: data.unit ?? null,
        location: data.location ?? null,
        status: data.status ?? 'ACTIVE',
        notes: data.notes ?? null,
      },
      include: { category: CATEGORY },
    });
    return row as StockItemEntity;
  }

  async updateItem(id: string, data: UpdateStockItemData): Promise<StockItemEntity> {
    const row = await this.prisma.stockItem.update({
      where: { id },
      data,
      include: { category: CATEGORY },
    });
    return row as StockItemEntity;
  }

  async softDeleteItem(id: string): Promise<void> {
    await this.prisma.stockItem.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countCharterLinks(itemId: string): Promise<number> {
    return this.prisma.charterEquipment.count({ where: { stockItemId: itemId } });
  }

  findCategories(): Promise<StockCategoryEntity[]> {
    return this.prisma.stockCategory.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      take: 100,
    });
  }

  async categoryExists(id: string): Promise<boolean> {
    const found = await this.prisma.stockCategory.findUnique({ where: { id }, select: { id: true } });
    return found !== null;
  }

  createCategory(name: string): Promise<StockCategoryEntity> {
    return this.prisma.stockCategory.create({ data: { name } });
  }

  updateCategory(
    id: string,
    data: { name?: string; isActive?: boolean },
  ): Promise<StockCategoryEntity> {
    return this.prisma.stockCategory.update({ where: { id }, data });
  }

  // Conta TODAS as linhas, inclusive as soft-deletadas. É contra-intuitivo, mas
  // é o que a FK enxerga: `StockItem.categoryId` é RESTRICT e a linha do item
  // excluído continua existindo. Contar só as vivas deixaria o DELETE passar
  // pela checagem e estourar erro cru de constraint no banco.
  countItemsInCategory(categoryId: string): Promise<number> {
    return this.prisma.stockItem.count({ where: { categoryId } });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.prisma.stockCategory.delete({ where: { id } });
  }
}
