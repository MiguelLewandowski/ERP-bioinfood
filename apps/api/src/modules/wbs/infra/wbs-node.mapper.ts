import { WbsNodeEntity } from '../domain/wbs-node.entity';

export interface WbsNodeDto {
  id: string;
  projectId: string;
  parentId: string | null;
  code: string;
  title: string;
  owner: string | null;
  readyCriteria: string | null;
  outputs: string | null;
  order: number;
}

export function toWbsNodeDto(n: WbsNodeEntity): WbsNodeDto {
  return {
    id: n.id,
    projectId: n.projectId,
    parentId: n.parentId,
    code: n.code,
    title: n.title,
    owner: n.owner,
    readyCriteria: n.readyCriteria,
    outputs: n.outputs,
    order: n.order,
  };
}
