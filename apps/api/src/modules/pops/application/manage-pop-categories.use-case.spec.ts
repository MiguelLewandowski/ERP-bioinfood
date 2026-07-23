import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ManagePopCategoriesUseCase } from './manage-pop-categories.use-case';
import { IPopRepository } from '../domain/pops.repository.interface';

function makeRepo(overrides: Partial<IPopRepository> = {}) {
  return {
    findCategories: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Análise', isActive: true, order: 0 }]),
    createCategory: vi.fn().mockImplementation((name: string) => Promise.resolve({ id: 'c2', name })),
    updateCategory: vi.fn().mockResolvedValue({ id: 'c1', name: 'Novo', isActive: true, order: 0 }),
    categoryExists: vi.fn().mockResolvedValue(true),
    countPopsInCategory: vi.fn().mockResolvedValue(0),
    deleteCategory: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IPopRepository;
}

describe('ManagePopCategoriesUseCase', () => {
  let repo: IPopRepository;
  let useCase: ManagePopCategoriesUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new ManagePopCategoriesUseCase(repo);
  });

  it('should trim the name before creating', async () => {
    await useCase.create('  Análise laboratorial  ');

    expect(repo.createCategory).toHaveBeenCalledWith('Análise laboratorial');
  });

  // A FK é RESTRICT: sem esta checagem o banco devolveria erro cru de constraint.
  it('should refuse to delete a category still in use', async () => {
    repo = makeRepo({ countPopsInCategory: vi.fn().mockResolvedValue(3) });
    useCase = new ManagePopCategoriesUseCase(repo);

    await expect(useCase.remove('c1')).rejects.toThrow(ConflictException);
    expect(repo.deleteCategory).not.toHaveBeenCalled();
  });

  it('should tell how many POPs block the deletion', async () => {
    repo = makeRepo({ countPopsInCategory: vi.fn().mockResolvedValue(3) });
    useCase = new ManagePopCategoriesUseCase(repo);

    await expect(useCase.remove('c1')).rejects.toThrow(/3 POP/);
  });

  it('should delete a category that no POP uses', async () => {
    await useCase.remove('c1');

    expect(repo.deleteCategory).toHaveBeenCalledWith('c1');
  });

  it('should throw NotFoundException when the category does not exist', async () => {
    repo = makeRepo({ categoryExists: vi.fn().mockResolvedValue(false) });
    useCase = new ManagePopCategoriesUseCase(repo);

    await expect(useCase.remove('missing')).rejects.toThrow(NotFoundException);
    await expect(useCase.update('missing', { name: 'x' })).rejects.toThrow(NotFoundException);
  });
});
