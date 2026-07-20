export interface PopEntity {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PopVersionEntity {
  id: string;
  popId: string;
  versionNumber: number;
  changeNotes: string | null;
  fileUrl: string | null;
  createdById: string;
  createdAt: Date;
}

export interface PopVersionWithAuthor extends PopVersionEntity {
  createdBy: { id: string; name: string };
}

export interface PopWithLatestVersion extends PopEntity {
  latestVersion: PopVersionWithAuthor;
}

export interface PopWithVersions extends PopEntity {
  versions: PopVersionWithAuthor[];
}

export interface CreatePopData {
  projectId: string;
  title: string;
  description?: string;
  createdById: string;
}

export interface UpdatePopData {
  title?: string;
  description?: string | null;
}

export interface CreatePopVersionData {
  changeNotes?: string;
  fileUrl?: string;
  createdById: string;
}
