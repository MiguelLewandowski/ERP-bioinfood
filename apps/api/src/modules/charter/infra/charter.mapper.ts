import { CharterWithMeta } from '../domain/charter.entity';

export interface CharterDto {
  id: string;
  projectId: string;
  projectType: string | null;
  priority: string | null;
  projectOwnerId: string | null;
  problem: string | null;
  justification: string | null;
  assumptions: string | null;
  mainObjective: string | null;
  specificObjectives: string | null;
  kpis: string | null;
  scope: string | null;
  outOfScope: string | null;
  deliverables: string | null;
  infrastructure: string | null;
  budget: number | null;
  team: { id: string; name: string }[];
  governance: string | null;
  dependencies: string | null;
  constraints: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  lastEditedBy: { id: string; name: string } | null;
  lastEditedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toCharterDto(c: CharterWithMeta): CharterDto {
  return {
    id: c.id,
    projectId: c.projectId,
    projectType: c.projectType,
    priority: c.priority,
    projectOwnerId: c.projectOwnerId,
    problem: c.problem,
    justification: c.justification,
    assumptions: c.assumptions,
    mainObjective: c.mainObjective,
    specificObjectives: c.specificObjectives,
    kpis: c.kpis,
    scope: c.scope,
    outOfScope: c.outOfScope,
    deliverables: c.deliverables,
    infrastructure: c.infrastructure,
    budget: c.budget,
    team: c.team,
    governance: c.governance,
    dependencies: c.dependencies,
    constraints: c.constraints,
    approvedById: c.approvedById,
    approvedAt: c.approvedAt,
    lastEditedBy: c.lastEditedBy,
    lastEditedAt: c.lastEditedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
