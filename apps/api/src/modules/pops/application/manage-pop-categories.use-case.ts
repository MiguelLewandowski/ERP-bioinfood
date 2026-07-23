import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { IPopRepository, POP_REPOSITORY } from '../domain/pops.repository.interface';

@Injectable()
export class ManagePopCategoriesUseCase {
  constructor(@Inject(POP_REPOSITORY) private repo: IPopRepository) {}

  list() {
    return this.repo.findCategories();
  }

  create(name: string) {
    return this.repo.createCategory(name.trim());
  }

  async update(id: string, data: { name?: string; isActive?: boolean }) {
    if (!(await this.repo.categoryExists(id))) throw new NotFoundException('Categoria não encontrada');
    return this.repo.updateCategory(id, { ...data, name: data.name?.trim() });
  }

  // A FK é RESTRICT: sem esta checagem o banco devolveria erro cru de constraint.
  // Categoria em uso deve ser desativada, não excluída — mesma regra das
  // taxonomias do CRM (produto/serviço).
  async remove(id: string) {
    if (!(await this.repo.categoryExists(id))) throw new NotFoundException('Categoria não encontrada');
    const inUse = await this.repo.countPopsInCategory(id);
    if (inUse > 0) {
      throw new ConflictException(
        `Esta categoria está em uso por ${inUse} POP(s). Desative-a em vez de excluir.`,
      );
    }
    await this.repo.deleteCategory(id);
  }
}
