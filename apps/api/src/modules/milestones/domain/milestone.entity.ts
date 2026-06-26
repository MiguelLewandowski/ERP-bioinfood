export interface MilestoneEntity {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  date: Date;
  reached: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateMilestoneData {
  projectId: string;
  title: string;
  description?: string;
  date: Date;
  reached?: boolean;
  order?: number;
}

export interface UpdateMilestoneData {
  title?: string;
  description?: string | null;
  date?: Date;
  reached?: boolean;
  order?: number;
}
