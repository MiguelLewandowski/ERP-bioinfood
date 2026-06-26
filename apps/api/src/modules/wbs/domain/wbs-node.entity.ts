export interface WbsNodeEntity {
  id: string;
  projectId: string;
  parentId: string | null;
  code: string;
  title: string;
  owner: string | null;
  readyCriteria: string | null;
  outputs: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface WbsNodeWithChildren extends WbsNodeEntity {
  children: WbsNodeWithChildren[];
  tasks: Array<{ id: string; title: string; status: string }>;
}

export interface CreateWbsNodeData {
  projectId: string;
  parentId?: string;
  code: string;
  title: string;
  owner?: string;
  readyCriteria?: string;
  outputs?: string;
  order?: number;
}

export interface UpdateWbsNodeData {
  parentId?: string | null;
  code?: string;
  title?: string;
  owner?: string | null;
  readyCriteria?: string | null;
  outputs?: string | null;
  order?: number;
}
