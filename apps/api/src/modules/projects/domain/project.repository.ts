import {
  CreateProjectData,
  ProjectAccessEntity,
  ProjectWithRelations,
  UpdateProjectData,
} from './project.entity';

export const PROJECT_REPOSITORY = 'PROJECT_REPOSITORY';

export interface IProjectRepository {
  findAll(): Promise<ProjectWithRelations[]>;
  findAllByUserId(userId: string): Promise<ProjectWithRelations[]>;
  findById(id: string): Promise<ProjectWithRelations | null>;
  create(data: CreateProjectData): Promise<ProjectWithRelations>;
  update(id: string, data: UpdateProjectData): Promise<ProjectWithRelations>;
  updateStatus(id: string, status: string): Promise<void>;
  // Exclusão definitiva (hard delete); cascade remove as relações do projeto.
  delete(id: string): Promise<void>;
  // Snapshot das datas atuais das tasks → baseline. Retorna o projeto atualizado.
  setBaseline(projectId: string, userId: string): Promise<ProjectWithRelations>;
  grantAccess(projectId: string, userId: string, grantedById: string): Promise<ProjectAccessEntity>;
  revokeAccess(projectId: string, userId: string): Promise<void>;
}
