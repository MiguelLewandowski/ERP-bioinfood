// ── Enums ────────────────────────────────────────────────────────────────────

export type SystemRole = 'ADMIN' | 'APROVA' | 'INSERE' | 'CONSULTA' | 'CLIENTE';
export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskProbability = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type RiskImpact = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  isActive: boolean;
  createdAt: string;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  clientName: string | null;
  objective: string | null;
  sponsor: string | null;
  createdBy: { id: string; name: string };
  accesses: Array<{ user: { id: string; name: string } }>;
  createdAt: string;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface TaskChecklistItemDto {
  id: string;
  taskId: string;
  text: string;
  checked: boolean;
  order: number;
}

export interface TaskDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number | null;
  order: number;
  assignee: { id: string; name: string } | null;
  wbsNode: { id: string; code: string; title: string } | null;
  startDate: string | null;
  dueDate: string | null;
  predecessors: Array<{ id: string; predecessorId: string }>;
  successors: Array<{ id: string; successorId: string }>;
  checklist: TaskChecklistItemDto[];
  deletedAt: string | null;
}

// ── Risks ─────────────────────────────────────────────────────────────────────

export interface RiskDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  probability: RiskProbability;
  impact: RiskImpact;
  score: number;
  response: string | null;
  owner: { id: string; name: string } | null;
}

// ── Milestones ────────────────────────────────────────────────────────────────

export interface MilestoneDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  date: string;
  reached: boolean;
  order: number;
}

// ── WBS ───────────────────────────────────────────────────────────────────────

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

// ── Charter ───────────────────────────────────────────────────────────────────

export interface CharterDto {
  id: string;
  projectId: string;
  projectType: string | null;
  priority: string | null;
  projectOwner: string | null;
  team: string | null;
  problem: string | null;
  justification: string | null;
  assumptions: string | null;
  mainObjective: string | null;
  specificObjectives: string | null;
  kpis: string | null;
  scope: string | null;
  outOfScope: string | null;
  deliverables: string | null;
  resources: string | null;
  stakeholders: string | null;
  governance: string | null;
  dependencies: string | null;
  constraints: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function checklistProgress(checklist: TaskChecklistItemDto[]): number {
  if (checklist.length === 0) return 0;
  return Math.round((checklist.filter((i) => i.checked).length / checklist.length) * 100);
}
