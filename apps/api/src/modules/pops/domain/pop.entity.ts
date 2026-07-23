export interface PopEntity {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PopCategoryEntity {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
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
  category: { id: string; name: string };
  latestVersion: PopVersionWithAuthor;
}

export interface PopWithVersions extends PopEntity {
  category: { id: string; name: string };
  versions: PopVersionWithAuthor[];
}

export interface CreatePopData {
  title: string;
  description?: string;
  categoryId: string;
  fileUrl?: string;
  createdById: string;
}

export interface UpdatePopData {
  title?: string;
  description?: string | null;
  categoryId?: string;
}

export interface CreatePopVersionData {
  changeNotes?: string;
  fileUrl?: string;
  createdById: string;
}
