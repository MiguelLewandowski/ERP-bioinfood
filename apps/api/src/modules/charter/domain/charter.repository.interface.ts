import {
  CharterEntity,
  CharterEquipmentEntity,
  CharterLastEdit,
  UpsertCharterData,
} from './charter.entity';

export const CHARTER_REPOSITORY = 'CHARTER_REPOSITORY';

export interface ICharterRepository {
  findByProject(projectId: string): Promise<CharterEntity | null>;
  upsert(projectId: string, data: UpsertCharterData): Promise<CharterEntity>;
  approve(projectId: string, approvedById: string): Promise<CharterEntity>;
  findLastEdit(charterId: string): Promise<CharterLastEdit | null>;

  // ── Checklist de recursos (Seção 6 do TAP) ──────────────────────────────
  // Escopadas por projectId, não por charterId: o cliente da API só conhece o
  // projeto, e resolver o TAP aqui dentro impede que um id de outro projeto
  // seja passado à toa.
  findEquipment(projectId: string): Promise<CharterEquipmentEntity[]>;
  addEquipment(projectId: string, stockItemId: string): Promise<CharterEquipmentEntity>;
  updateEquipment(
    projectId: string,
    id: string,
    data: { checked?: boolean; quantity?: number },
  ): Promise<CharterEquipmentEntity | null>;
  removeEquipment(projectId: string, id: string): Promise<boolean>;
}
