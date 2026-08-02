import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICharterRepository, CHARTER_REPOSITORY } from '../domain/charter.repository.interface';

/**
 * Checklist de recursos do TAP (Seção 6 — Recursos e Orçamento).
 *
 * Planejamento, não alocação: declara-se o que o projeto precisa e marca-se o
 * que já foi providenciado. Dois projetos podem declarar o mesmo equipamento
 * sem conflito, porque não há janela de uso a disputar.
 */
@Injectable()
export class ManageCharterEquipmentUseCase {
  constructor(@Inject(CHARTER_REPOSITORY) private repo: ICharterRepository) {}

  list(projectId: string) {
    return this.repo.findEquipment(projectId);
  }

  add(projectId: string, stockItemId: string) {
    return this.repo.addEquipment(projectId, stockItemId);
  }

  async update(projectId: string, id: string, data: { checked?: boolean; quantity?: number }) {
    const updated = await this.repo.updateEquipment(projectId, id, data);
    if (!updated) throw new NotFoundException('Item não encontrado na checklist deste projeto');
    return updated;
  }

  async remove(projectId: string, id: string) {
    const removed = await this.repo.removeEquipment(projectId, id);
    if (!removed) throw new NotFoundException('Item não encontrado na checklist deste projeto');
  }
}
