import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ManageStockItemsUseCase } from './manage-stock-items.use-case';
import { ManageStockCategoriesUseCase } from './manage-stock-categories.use-case';
import { IStockRepository } from '../domain/stock.repository.interface';
import { StockItemEntity } from '../domain/stock.entity';

function makeItem(overrides: Partial<StockItemEntity> = {}): StockItemEntity {
  return {
    id: 'item-1',
    name: 'Autoclave vertical 75 L',
    code: 'BIO-0042',
    categoryId: 'cat-equip',
    category: { id: 'cat-equip', name: 'Equipamento' },
    quantity: 1,
    unit: null,
    location: 'Lab 2',
    status: 'ACTIVE',
    notes: null,
    createdAt: new Date('2026-07-30T12:00:00Z'),
    updatedAt: new Date('2026-07-30T12:00:00Z'),
    ...overrides,
  };
}

function makeRepo(overrides: Partial<IStockRepository> = {}): IStockRepository {
  return {
    findItems: vi.fn(async () => [makeItem()]),
    findItemById: vi.fn(async (id: string) => (id === 'item-1' ? makeItem() : null)),
    createItem: vi.fn(async (data) => makeItem(data as Partial<StockItemEntity>)),
    updateItem: vi.fn(async (_id, data) => makeItem(data as Partial<StockItemEntity>)),
    softDeleteItem: vi.fn(async () => undefined),
    countCharterLinks: vi.fn(async () => 0),
    findCategories: vi.fn(async () => []),
    categoryExists: vi.fn(async (id: string) => id === 'cat-equip'),
    createCategory: vi.fn(async (name: string) => ({ id: 'cat-new', name, isActive: true, order: 0 })),
    updateCategory: vi.fn(async (id, data) => ({
      id, name: data.name ?? 'Equipamento', isActive: data.isActive ?? true, order: 0,
    })),
    countItemsInCategory: vi.fn(async () => 0),
    deleteCategory: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('ManageStockItemsUseCase', () => {
  let repo: IStockRepository;
  let useCase: ManageStockItemsUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new ManageStockItemsUseCase(repo);
  });

  it('should create the item when the category exists', async () => {
    await useCase.create({ name: 'Centrífuga', categoryId: 'cat-equip' });

    expect(repo.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Centrífuga', categoryId: 'cat-equip' }),
    );
  });

  it('should reject the item when the category does not exist', async () => {
    await expect(
      useCase.create({ name: 'Centrífuga', categoryId: 'cat-fantasma' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject an unknown status when creating', async () => {
    await expect(
      useCase.create({ name: 'Centrífuga', categoryId: 'cat-equip', status: 'QUEBRADO' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should turn blank code into null so it does not collide on the unique index', async () => {
    await useCase.create({ name: 'Béquer', categoryId: 'cat-equip', code: '   ' });

    expect(repo.createItem).toHaveBeenCalledWith(expect.objectContaining({ code: null }));
  });

  it('should refuse to delete the item when a project checklist uses it', async () => {
    repo = makeRepo({ countCharterLinks: vi.fn(async () => 3) });
    useCase = new ManageStockItemsUseCase(repo);

    await expect(useCase.remove('item-1')).rejects.toThrow(ConflictException);
    expect(repo.softDeleteItem).not.toHaveBeenCalled();
  });

  it('should soft delete the item when no project uses it', async () => {
    await useCase.remove('item-1');

    expect(repo.softDeleteItem).toHaveBeenCalledWith('item-1');
  });

  it('should fail when the item does not exist', async () => {
    await expect(useCase.get('sumiu')).rejects.toThrow(NotFoundException);
  });
});

describe('ManageStockCategoriesUseCase', () => {
  it('should refuse to delete the category when items still reference it', async () => {
    const repo = makeRepo({ countItemsInCategory: vi.fn(async () => 5) });
    const useCase = new ManageStockCategoriesUseCase(repo);

    await expect(useCase.remove('cat-equip')).rejects.toThrow(ConflictException);
    expect(repo.deleteCategory).not.toHaveBeenCalled();
  });

  it('should delete the category when it is empty', async () => {
    const repo = makeRepo();
    const useCase = new ManageStockCategoriesUseCase(repo);

    await useCase.remove('cat-equip');

    expect(repo.deleteCategory).toHaveBeenCalledWith('cat-equip');
  });

  it('should fail when the category does not exist', async () => {
    const repo = makeRepo();
    const useCase = new ManageStockCategoriesUseCase(repo);

    await expect(useCase.remove('cat-fantasma')).rejects.toThrow(NotFoundException);
  });

  it('should trim the name when creating', async () => {
    const repo = makeRepo();
    const useCase = new ManageStockCategoriesUseCase(repo);

    await useCase.create('  Vidraria  ');

    expect(repo.createCategory).toHaveBeenCalledWith('Vidraria');
  });
});
