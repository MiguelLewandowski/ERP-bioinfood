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
  forecastEndDate: string | null;
  baselineSetAt: string | null;
  baselineSetBy: { id: string; name: string } | null;
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
  parentId: string | null;
  assignee: { id: string; name: string } | null;
  wbsNode: { id: string; code: string; title: string } | null;
  startDate: string | null;
  dueDate: string | null;
  baselineStart: string | null;
  baselineEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  predecessors: Array<{ id: string; predecessorId: string }>;
  successors: Array<{ id: string; successorId: string }>;
  checklist: TaskChecklistItemDto[];
  deletedAt: string | null;
}

// ── Activities (visão de tasks por data) ───────────────────────────────────────

export interface ActivityPredecessorDto {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface ActivityDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  project: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  predecessors: ActivityPredecessorDto[];
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

/**
 * Regra única da data-âncora de uma atividade no cronograma: a data de início
 * (startDate); na ausência dela, o prazo (dueDate). Usada para agrupar/filtrar
 * atividades por dia. O backend reproduz a mesma regra na query SQL de
 * `/activities` (ver activities.prisma.repository.ts).
 */
export function taskAnchorDate(
  t: { startDate: string | null; dueDate: string | null },
): string | null {
  return t.startDate ?? t.dueDate;
}

export function checklistProgress(checklist: TaskChecklistItemDto[]): number {
  if (checklist.length === 0) return 0;
  return Math.round((checklist.filter((i) => i.checked).length / checklist.length) * 100);
}
