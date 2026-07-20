import {
  CreatePopData,
  CreatePopVersionData,
  PopWithLatestVersion,
  PopWithVersions,
  UpdatePopData,
} from './pop.entity';

export const POP_REPOSITORY = 'POP_REPOSITORY';

export interface IPopRepository {
  findAllByProject(projectId: string): Promise<PopWithLatestVersion[]>;
  findById(id: string): Promise<PopWithVersions | null>;
  create(data: CreatePopData): Promise<PopWithVersions>;
  update(id: string, data: UpdatePopData): Promise<PopWithVersions>;
  softDelete(id: string): Promise<void>;
  createVersion(popId: string, data: CreatePopVersionData): Promise<PopWithVersions>;
  nextVersionNumber(popId: string): Promise<number>;
  // Usado pelo módulo tasks para validar que a versão vinculada pertence ao
  // mesmo projeto da task (anti-IDOR) sem acoplar os dois módulos inteiros.
  findVersionProjectRef(popVersionId: string): Promise<{ id: string; projectId: string } | null>;
}
