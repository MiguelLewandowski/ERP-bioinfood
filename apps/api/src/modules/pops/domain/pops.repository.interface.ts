import {
  CreatePopData,
  CreatePopVersionData,
  PopCategoryEntity,
  PopWithLatestVersion,
  PopWithVersions,
  UpdatePopData,
} from './pop.entity';

export const POP_REPOSITORY = 'POP_REPOSITORY';

export interface PopFilter {
  /** Busca por título ou descrição, sem distinção de maiúsculas. */
  search?: string;
  categoryId?: string;
}

export interface IPopRepository {
  findAll(filter?: PopFilter): Promise<PopWithLatestVersion[]>;
  findCategories(): Promise<PopCategoryEntity[]>;
  createCategory(name: string): Promise<PopCategoryEntity>;
  updateCategory(id: string, data: { name?: string; isActive?: boolean }): Promise<PopCategoryEntity>;
  countPopsInCategory(categoryId: string): Promise<number>;
  deleteCategory(id: string): Promise<void>;
  categoryExists(id: string): Promise<boolean>;
  findById(id: string): Promise<PopWithVersions | null>;
  create(data: CreatePopData): Promise<PopWithVersions>;
  update(id: string, data: UpdatePopData): Promise<PopWithVersions>;
  softDelete(id: string): Promise<void>;
  createVersion(popId: string, data: CreatePopVersionData): Promise<PopWithVersions>;
  nextVersionNumber(popId: string): Promise<number>;
  // Usado pelo módulo tasks para confirmar que a versão existe (POP é global,
  // sem restrição de projeto) antes de vincular a uma task.
  findVersionRef(popVersionId: string): Promise<{ id: string } | null>;
}
