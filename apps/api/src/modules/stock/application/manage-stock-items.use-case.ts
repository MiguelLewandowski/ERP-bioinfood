import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  IStockRepository,
  STOCK_REPOSITORY,
  StockItemFilter,
} from '../domain/stock.repository.interface';
import {
  CreateStockItemData,
  STOCK_ITEM_STATUSES,
  UpdateStockItemData,
} from '../domain/stock.entity';

@Injectable()
export class ManageStockItemsUseCase {
  constructor(@Inject(STOCK_REPOSITORY) private repo: IStockRepository) {}

  list(filter: StockItemFilter = {}) {
    return this.repo.findItems(filter);
  }

  async get(id: string) {
    const item = await this.repo.findItemById(id);
    if (!item) throw new NotFoundException('Item não encontrado');
    return item;
  }

  async create(data: CreateStockItemData) {
    await this.assertCategory(data.categoryId);
    this.assertStatus(data.status);
    return this.repo.createItem(this.normalize(data));
  }

  async update(id: string, data: UpdateStockItemData) {
    await this.get(id);
    if (data.categoryId) await this.assertCategory(data.categoryId);
    this.assertStatus(data.status);
    return this.repo.updateItem(id, this.normalize(data));
  }

  /**
   * Exclusão é SOFT (o cadastro some da tela, a linha fica). Item já usado em
   * TAP é bloqueado: a FK de `CharterEquipment` é RESTRICT, e um item some do
   * cadastro deixaria a checklist do projeto apontando para o vazio. Aposentar
   * (status RETIRED) é o caminho para equipamento que saiu de operação.
   */
  async remove(id: string) {
    await this.get(id);
    const inUse = await this.repo.countCharterLinks(id);
    if (inUse > 0) {
      throw new ConflictException(
        `Este item está na checklist de ${inUse} projeto(s). ` +
          'Marque-o como "Aposentado" em vez de excluir.',
      );
    }
    await this.repo.softDeleteItem(id);
  }

  private async assertCategory(categoryId: string) {
    if (!(await this.repo.categoryExists(categoryId))) {
      throw new BadRequestException('Categoria não encontrada');
    }
  }

  private assertStatus(status?: string) {
    if (status && !STOCK_ITEM_STATUSES.includes(status as never)) {
      throw new BadRequestException(`Situação inválida: ${status}`);
    }
  }

  /** Campo de texto em branco vira null — evita `code: ""` colidir no @unique. */
  private normalize<T extends UpdateStockItemData>(data: T): T {
    const blankToNull = (v: string | null | undefined) =>
      v === undefined ? undefined : v?.trim() ? v.trim() : null;
    return {
      ...data,
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      code: blankToNull(data.code),
      unit: blankToNull(data.unit),
      location: blankToNull(data.location),
      notes: blankToNull(data.notes),
    };
  }
}
