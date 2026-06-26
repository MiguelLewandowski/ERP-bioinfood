import { ProjectStatus, SystemRole } from '@prisma/client';

export interface ProjectEntity {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
  clientName: string | null;
  objective: string | null;
  sponsor: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithRelations extends ProjectEntity {
  createdBy: { id: string; name: string };
  accesses: Array<{
    id: string;
    userId: string;
    projectId: string;
    grantedById: string | null;
    grantedAt: Date;
    user: { id: string; name: string };
  }>;
}

export interface ProjectAccessEntity {
  id: string;
  projectId: string;
  userId: string;
  grantedById: string | null;
  grantedAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  role: SystemRole;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  clientName?: string;
  objective?: string;
  sponsor?: string;
  createdById: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  clientName?: string;
  objective?: string;
  sponsor?: string;
}
