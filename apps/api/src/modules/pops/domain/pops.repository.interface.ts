import {
  CreatePopData,
  CreatePopVersionData,
  PopWithLatestVersion,
  PopWithVersions,
  UpdatePopData,
} from './pop.entity';

export const POP_REPOSITORY = 'POP_REPOSITORY';

export interface IPopRepository {
  findAll(): Promise<PopWithLatestVersion[]>;
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
