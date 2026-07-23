// ── Enums ────────────────────────────────────────────────────────────────────

/**
 * ADMIN   — faz e vê tudo, inclusive usuários, CRM e exclusão definitiva.
 * PADRAO  — interno: vê e edita todos os projetos. Sem tela de usuários, sem
 *           CRM, e nada de exclusão irreversível (só soft delete).
 * CLIENTE — externo: só os projetos liberados em ProjectAccess.
 */
export type SystemRole = 'ADMIN' | 'PADRAO' | 'CLIENTE';

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  ADMIN: 'Administrador',
  PADRAO: 'Usuário padrão',
  CLIENTE: 'Cliente',
};
export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
// PMBOK: FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish), SF (Start-to-Finish).
export type TaskDependencyType = 'FS' | 'SS' | 'FF' | 'SF';
export type RiskProbability = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type RiskImpact = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface UserProjectAccessDto {
  id: string;
  name: string;
  status: ProjectStatus;
}

// ── Organizations (dados mestres) ───────────────────────────────────────────

// Higiene de registro. O estágio COMERCIAL (prospect/ativo/VIP) é CustomerProfile.stage.
export type OrganizationStatus = 'ACTIVE' | 'ARCHIVED';
export type DocumentType = 'CNPJ' | 'CPF' | 'FOREIGN' | 'OTHER';
export type RegistrationStatus =
  | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CLOSED' | 'VOID' | 'UNKNOWN';
export type PartyRoleType =
  | 'CUSTOMER' | 'SUPPLIER' | 'CARRIER' | 'PARTNER' | 'FUNDING_AGENCY' | 'RESEARCH_INSTITUTION';
export type AddressType = 'PRIMARY' | 'BILLING' | 'SHIPPING' | 'COLLECTION';
export type CustomerStage = 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'VIP';

export interface OrganizationDto {
  id: string;
  legalName: string;
  tradeName: string | null;
  document: string | null;
  status: OrganizationStatus;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  sector: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  roleTypes: PartyRoleType[];
}

export interface OrgRoleDto {
  id: string;
  type: PartyRoleType;
  status: string;
}

export interface OrgAddressDto {
  id: string;
  type: AddressType;
  isPrimary: boolean;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string;
}

export interface OrgCustomerProfileDto {
  stage: CustomerStage;
  paymentTerms: string | null;
  creditLimit: string | null;
  salesRepId: string | null;
  salesRep: { id: string; name: string } | null;
}

export interface OrganizationDetailDto extends OrganizationDto {
  partyType: string;
  documentType: DocumentType | null;
  stateRegistration: string | null;
  cityRegistration: string | null;
  cnae: string | null;
  registrationStatus: RegistrationStatus;
  website: string | null;
  notes: string | null;
  sectorId: string | null;
  sourceId: string | null;
  categoryId: string | null;
  productServices: Array<{ id: string; name: string }>;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  fax: string | null;
  ramal: string | null;
  facebook: string | null;
  twitter: string | null;
  linkedin: string | null;
  skype: string | null;
  instagram: string | null;
  roles: OrgRoleDto[];
  addresses: OrgAddressDto[];
  customerProfile: OrgCustomerProfileDto | null;
}

// CNPJ enrichment suggestion (BrasilAPI). enriched=false => manual entry.
export interface EnrichmentResultDto {
  enriched: boolean;
  legalName?: string;
  tradeName?: string;
  registrationStatus?: RegistrationStatus;
  cnae?: string;
  description?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

// ── Pipelines / Oportunidades (funil) ───────────────────────────────────────

export type StageType = 'OPEN' | 'WON' | 'LOST';

export interface StageDto {
  id: string;
  name: string;
  type: StageType;
  probability: number;
  color: string | null;
  order: number;
  isActive: boolean;
}

export interface PipelineDto {
  id: string;
  name: string;
  abbreviation: string;
  isDefault: boolean;
  isActive: boolean;
  order: number;
  stages: StageDto[];
}

export interface OpportunityDto {
  id: string;
  title: string;
  amount: string | null;
  currency: string;
  probability: number | null;
  pipelineId: string;
  stageId: string;
  startDate: string | null;
  description: string | null;
  expectedCloseDate: string | null;
  closedAt: string | null;
  frozenAt: string | null;
  order: number;
  engagementStageId: string | null;
  organization: { id: string; legalName: string; tradeName: string | null };
  mainContact: { id: string; name: string } | null;
  responsible: { id: string; name: string } | null;
  pipeline: { id: string; name: string };
  stage: { id: string; name: string; type: StageType };
}

export interface StageSummaryDto {
  stageId: string;
  name: string;
  type: StageType;
  count: number;
  amount: string;
}

export interface PipelineSummaryDto {
  stages: StageSummaryDto[];
  openTotal: string;
  weightedTotal: string;
  wonCount: number;
  lostCount: number;
  conversionRate: number;
}

// ── Taxonomies (setores, origens, escada de engajamento) ────────────────────

export type TaxonomyKind = 'sectors' | 'sources' | 'engagement-stages' | 'categories' | 'product-services';

export interface TaxonomyDto {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

// ── Contacts (pessoas) ──────────────────────────────────────────────────────

export interface ContactListItemDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  source: { id: string; name: string } | null;
  // Present only when the list is filtered by organization.
  link?: {
    linkId: string;
    jobTitle: string | null;
    isDecision: boolean;
    isFinance: boolean;
    isTechnical: boolean;
    isPrimary: boolean;
  } | null;
}

export interface ContactLinkDto {
  id: string;
  orgId: string;
  organization: { id: string; legalName: string; tradeName: string | null };
  jobTitle: string | null;
  department: string | null;
  isDecision: boolean;
  isFinance: boolean;
  isTechnical: boolean;
  isPrimary: boolean;
  isActive: boolean;
}

export interface ContactDetailDto extends ContactListItemDto {
  cpf: string | null;
  whatsapp: string | null;
  fax: string | null;
  ramal: string | null;
  birthDate: string | null;
  facebook: string | null;
  twitter: string | null;
  linkedin: string | null;
  skype: string | null;
  instagram: string | null;
  notes: string | null;
  orgLinks: ContactLinkDto[];
}

// ── Interações (timeline do CRM) ────────────────────────────────────────────

export type InteractionType = 'EMAIL' | 'CALL' | 'MEETING' | 'VISIT' | 'WHATSAPP' | 'OTHER';
export type InteractionDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL';

export interface InteractionDto {
  id: string;
  orgId: string;
  contactId: string | null;
  userId: string | null;
  type: InteractionType;
  direction: InteractionDirection;
  subject: string | null;
  summary: string | null;
  fullContent: string | null;
  interactionAt: string;
  createdAt: string;
  contact: { id: string; name: string } | null;
  user: { id: string; name: string } | null;
}

// ── Atividades / follow-ups do CRM (não confundir com tarefas de projeto) ──

export type ActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type DueFilter = 'today' | 'overdue' | 'week';
export type CrmActivityType = 'NOTE' | 'EMAIL' | 'CALL' | 'WHATSAPP' | 'PROPOSAL' | 'MEETING' | 'VISIT';

export interface CrmActivityDto {
  id: string;
  orgId: string | null;
  contactId: string | null;
  interactionId: string | null;
  opportunityId: string | null;
  responsibleId: string | null;
  title: string;
  description: string | null;
  type: CrmActivityType;
  priority: TaskPriority;
  status: ActivityStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  organization: { id: string; legalName: string; tradeName: string | null } | null;
  contact: { id: string; name: string } | null;
  opportunity: { id: string; title: string } | null;
  responsible: { id: string; name: string } | null;
}

// ── Busca global (command palette) ───────────────────────────────────────────

export type SearchResultType = 'project' | 'organization' | 'opportunity' | 'contact';

export interface SearchResultDto {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  /** Id auxiliar para montar o link (orgId em contato/oportunidade). */
  refId: string | null;
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
  client: { id: string; legalName: string; tradeName: string | null } | null;
  objective: string | null;
  createdBy: { id: string; name: string };
  accesses: Array<{ user: { id: string; name: string } }>;
  /** Equipe declarada no TAP — quem trabalha no projeto sem depender de ProjectAccess. */
  team: Array<{ id: string; name: string }>;
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

export interface TaskPopUsageDto {
  id: string;
  popVersionId: string;
  addedBy: { id: string; name: string };
  pop: { id: string; title: string };
  versionNumber: number;
  createdAt: string;
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
  predecessors: Array<{ id: string; predecessorId: string; type: TaskDependencyType; lag: number }>;
  successors: Array<{ id: string; successorId: string; type: TaskDependencyType; lag: number }>;
  checklist: TaskChecklistItemDto[];
  pops: TaskPopUsageDto[];
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

// ── Stakeholders (registro de partes interessadas, PMBOK) ──────────────────────

export type StakeholderType = 'SPONSOR' | 'OWNER' | 'TEAM_MEMBER' | 'STAKEHOLDER';

// Grade Poder × Interesse (Modelo de Mendelow): quadrante calculado no backend
// a partir de influence/interest — nunca recalcular no front (fonte única).
export type PowerInterestQuadrant = 'MANAGE_CLOSELY' | 'KEEP_SATISFIED' | 'KEEP_INFORMED' | 'MONITOR';

export interface StakeholderDto {
  id: string;
  projectId: string;
  contactId: string;
  type: StakeholderType;
  roleNote: string | null;
  influence: RiskImpact | null;
  interest: RiskImpact | null;
  quadrant: PowerInterestQuadrant | null;
  contact: { id: string; name: string; email: string | null; phone: string | null };
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

// ── POPs (Procedimento Operacional Padrão, versionável) ─────────────────────────

export interface PopVersionDto {
  id: string;
  versionNumber: number;
  changeNotes: string | null;
  fileUrl: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
}

export interface PopCategoryDto {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

export interface PopDto {
  id: string;
  title: string;
  description: string | null;
  /** Toda POP pertence a uma categoria — obrigatório desde 2026-07-23. */
  category: { id: string; name: string };
  latestVersion: PopVersionDto;
  createdAt: string;
}

export interface PopDetailDto extends PopDto {
  versions: PopVersionDto[];
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
  approvedAt: string | null;
  lastEditedBy: { id: string; name: string } | null;
  lastEditedAt: string | null;
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

export * from './schemas';
