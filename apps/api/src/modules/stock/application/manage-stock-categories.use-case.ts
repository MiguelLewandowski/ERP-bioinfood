import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { IStockRepository, STOCK_REPOSITORY } from '../domain/stock.repository.interface';

/**
 * Categorias do estoque. Mesma forma da taxonomia de POPs
 * (`ManagePopCategoriesUseCase`) — o cadastro nasce só com "Equipamento" e
 * cresce pela tela, sem migration.
 */
@Injectable()
export class ManageStockCategoriesUseCase {
  constructor(@Inject(STOCK_REPOSITORY) private repo: IStockRepository) {}

  list() {
    return this.repo.findCategories();
  }

  create(name: string) {
    return this.repo.createCategory(name.trim());
  }

  async update(id: string, data: { name?: string; isActive?: boolean }) {
    if (!(await this.repo.categoryExists(id))) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return this.repo.updateCategory(id, { ...data, name: data.name?.trim() });
  }

  // A FK é RESTRICT: sem esta checagem o banco devolveria erro cru de constraint.
  // Categoria em uso deve ser desativada, não excluída.
  async remove(id: string) {
    if (!(await this.repo.categoryExists(id))) {
      throw new NotFoundException('Categoria não encontrada');
    }
    const inUse = await this.repo.countItemsInCategory(id);
    if (inUse > 0) {
      throw new ConflictException(
        `Esta categoria está em uso por ${inUse} item(ns). Desative-a em vez de excluir.`,
      );
    }
    await this.repo.deleteCategory(id);
  }
}
