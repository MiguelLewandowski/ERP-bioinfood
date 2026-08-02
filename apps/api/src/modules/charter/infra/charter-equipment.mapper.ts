import type { CharterEquipmentDto } from '@bioinfood/shared';
import { CharterEquipmentEntity } from '../domain/charter.entity';

/**
 * `charterId` não sai no DTO: o cliente conhece o projeto, não o TAP. Expor o
 * id do Charter só daria margem a alguém montar rota por ele.
 */
export function toCharterEquipmentDto(entity: CharterEquipmentEntity): CharterEquipmentDto {
  return {
    id: entity.id,
    stockItemId: entity.stockItemId,
    quantity: entity.quantity,
    checked: entity.checked,
    item: entity.stockItem,
  };
}
