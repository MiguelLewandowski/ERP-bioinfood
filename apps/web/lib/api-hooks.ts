import { api } from './api';
import type {
  TaskDto,
  TaskChecklistItemDto,
  TaskPopUsageDto,
  TaskDependencyType,
  RiskDto,
  StakeholderDto,
  MilestoneDto,
  WbsNodeDto,
  CharterDto,
  ProjectDto,
  ActivityDto,
  OrganizationDto,
  OrganizationDetailDto,
  OrgRoleDto,
  OrgAddressDto,
  OrgCustomerProfileDto,
  EnrichmentResultDto,
  TaxonomyDto,
  TaxonomyKind,
  ContactListItemDto,
  ContactDetailDto,
  ContactLinkDto,
  PipelineDto,
  OpportunityDto,
  PipelineSummaryDto,
  InteractionDto,
  CrmActivityDto,
  DueFilter,
  ActivityStatus,
  UserDto,
  UserProjectAccessDto,
  SearchResultDto,
  PopDto,
  PopDetailDto,
  PopCategoryDto,
  PaginatedResult,
  StockItemDto,
  StockCategoryDto,
  CharterEquipmentDto,
  NoteDto,
  NoteListItemDto,
} from '@bioinfood/shared';

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: (projectId: string, token: string) =>
    api.get<TaskDto[]>(`/projects/${projectId}/tasks`, token),

  create: (projectId: string, data: Record<string, unknown>, token: string) =>
    api.post<TaskDto>(`/projects/${projectId}/tasks`, data, token),

  update: (projectId: string, id: string, data: Record<string, unknown>, token: string) =>
    api.patch<TaskDto>(`/projects/${projectId}/tasks/${id}`, data, token),

  remove: (projectId: string, id: string, token: string) =>
    api.delete<void>(`/projects/${projectId}/tasks/${id}`, token),

  reorder: (projectId: string, items: Array<{ id: string; order: number }>, token: string) =>
    api.patch<void>(`/projects/${projectId}/tasks/reorder`, { items }, token),

  addChecklist: (projectId: string, taskId: string, text: string, token: string) =>
    api.post<TaskChecklistItemDto>(`/projects/${projectId}/tasks/${taskId}/checklist`, { text }, token),

  updateChecklist: (
    projectId: string,
    taskId: string,
    itemId: string,
    data: { text?: string; checked?: boolean },
    token: string,
  ) =>
    api.patch<TaskChecklistItemDto>(
      `/projects/${projectId}/tasks/${taskId}/checklist/${itemId}`,
      data,
      token,
    ),

  removeChecklist: (projectId: string, taskId: string, itemId: string, token: string) =>
    api.delete<void>(`/projects/${projectId}/tasks/${taskId}/checklist/${itemId}`, token),

  addDependency: (
    projectId: string,
    taskId: string,
    predecessorId: string,
    token: string,
    type?: TaskDependencyType,
    lag?: number,
  ) =>
    api.post<unknown>(
      `/projects/${projectId}/tasks/${taskId}/dependencies`,
      { predecessorId, type, lag },
      token,
    ),

  removeDependency: (projectId: string, taskId: string, depId: string, token: string) =>
    api.delete<void>(`/projects/${projectId}/tasks/${taskId}/dependencies/${depId}`, token),

  addPop: (projectId: string, taskId: string, popVersionId: string, token: string) =>
    api.post<TaskPopUsageDto>(`/projects/${projectId}/tasks/${taskId}/pops`, { popVersionId }, token),

  removePop: (projectId: string, taskId: string, linkId: string, token: string) =>
    api.delete<void>(`/projects/${projectId}/tasks/${taskId}/pops/${linkId}`, token),
};

// ── Risks ─────────────────────────────────────────────────────────────────────

export const risksApi = {
  list: (projectId: string, token: string) =>
    api.get<RiskDto[]>(`/projects/${projectId}/risks`, token),

  create: (projectId: string, data: Record<string, unknown>, token: string) =>
    api.post<RiskDto>(`/projects/${projectId}/risks`, data, token),

  update: (projectId: string, id: string, data: Record<string, unknown>, token: string) =>
    api.patch<RiskDto>(`/projects/${projectId}/risks/${id}`, data, token),

  remove: (projectId: string, id: string, token: string) =>
    api.delete<void>(`/projects/${projectId}/risks/${id}`, token),
};

// ── Stakeholders (registro de partes interessadas, PMBOK) ──────────────────────

export const stakeholdersApi = {
  list: (projectId: string, token: string) =>
    api.get<StakeholderDto[]>(`/projects/${projectId}/stakeholders`, token),

  create: (projectId: string, data: Record<string, unknown>, token: string) =>
    api.post<StakeholderDto>(`/projects/${projectId}/stakeholders`, data, token),

  update: (projectId: string, id: string, data: Record<string, unknown>, token: string) =>
    api.patch<StakeholderDto>(`/projects/${projectId}/stakeholders/${id}`, data, token),

  remove: (projectId: string, id: string, token: string) =>
    api.delete<void>(`/projects/${projectId}/stakeholders/${id}`, token),
};

// ── Milestones ────────────────────────────────────────────────────────────────

export const milestonesApi = {
  list: (projectId: string, token: string) =>
    api.get<MilestoneDto[]>(`/projects/${projectId}/milestones`, token),

  create: (projectId: string, data: Record<string, unknown>, token: string) =>
    api.post<MilestoneDto>(`/projects/${projectId}/milestones`, data, token),

  update: (projectId: string, id: string, data: Record<string, unknown>, token: string) =>
    api.patch<MilestoneDto>(`/projects/${projectId}/milestones/${id}`, data, token),

  remove: (projectId: string, id: string, token: string) =>
    api.delete<void>(`/projects/${projectId}/milestones/${id}`, token),
};

// ── POPs (Procedimento Operacional Padrão, versionável) ─────────────────────────

export const popsApi = {
  // Catálogo global — sem escopo de projeto (docs/regras-negocio/pop.md).
  list: (token: string, filter: { search?: string; categoryId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (filter.search) qs.set('search', filter.search);
    if (filter.categoryId) qs.set('categoryId', filter.categoryId);
    const suffix = qs.toString();
    return api.get<PopDto[]>(`/pops${suffix ? `?${suffix}` : ''}`, token);
  },

  get: (id: string, token: string) =>
    api.get<PopDetailDto>(`/pops/${id}`, token),

  create: (
    data: { title: string; description?: string; categoryId: string; fileUrl?: string },
    token: string,
  ) => api.post<PopDetailDto>('/pops', data, token),

  listCategories: (token: string) =>
    api.get<PopCategoryDto[]>('/pops/categories', token),

  createCategory: (name: string, token: string) =>
    api.post<PopCategoryDto>('/pops/categories', { name }, token),

  updateCategory: (id: string, data: { name?: string; isActive?: boolean }, token: string) =>
    api.patch<PopCategoryDto>(`/pops/categories/${id}`, data, token),

  removeCategory: (id: string, token: string) =>
    api.delete<void>(`/pops/categories/${id}`, token),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    api.patch<PopDetailDto>(`/pops/${id}`, data, token),

  createVersion: (id: string, data: { changeNotes?: string; fileUrl?: string }, token: string) =>
    api.post<PopDetailDto>(`/pops/${id}/versions`, data, token),

  remove: (id: string, token: string) =>
    api.delete<void>(`/pops/${id}`, token),
};

// ── WBS ───────────────────────────────────────────────────────────────────────

export const wbsApi = {
  list: (projectId: string, token: string) =>
    api.get<WbsNodeDto[]>(`/projects/${projectId}/wbs`, token),

  create: (projectId: string, data: Record<string, unknown>, token: string) =>
    api.post<WbsNodeDto>(`/projects/${projectId}/wbs`, data, token),

  update: (projectId: string, id: string, data: Record<string, unknown>, token: string) =>
    api.patch<WbsNodeDto>(`/projects/${projectId}/wbs/${id}`, data, token),

  remove: (projectId: string, id: string, token: string) =>
    api.delete<void>(`/projects/${projectId}/wbs/${id}`, token),
};

// ── Charter ───────────────────────────────────────────────────────────────────

export const charterApi = {
  get: (projectId: string, token: string) =>
    api.get<CharterDto | null>(`/projects/${projectId}/charter`, token),

  upsert: (projectId: string, data: Record<string, unknown>, token: string) =>
    api.put<CharterDto>(`/projects/${projectId}/charter`, data, token),

  approve: (projectId: string, token: string) =>
    api.post<CharterDto>(`/projects/${projectId}/charter/approve`, {}, token),
};

// ── Activities ────────────────────────────────────────────────────────────────

export const activitiesApi = {
  // Lista atividades (tasks) de todos os projetos acessíveis no intervalo informado.
  list: (range: { from: string; to: string }, token: string) =>
    api.get<ActivityDto[]>(
      `/activities?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
      token,
    ),
};

// ── Projects ──────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: (token: string) =>
    api.get<ProjectDto[]>('/projects', token),

  get: (id: string, token: string) =>
    api.get<ProjectDto>(`/projects/${id}`, token),

  create: (data: Record<string, unknown>, token: string) =>
    api.post<ProjectDto>('/projects', data, token),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    api.patch<ProjectDto>(`/projects/${id}`, data, token),

  cancel: (id: string, token: string) =>
    api.delete<void>(`/projects/${id}`, token),

  // Exclusão definitiva (hard delete) — apenas ADMIN no backend.
  remove: (id: string, token: string) =>
    api.delete<void>(`/projects/${id}/permanent`, token),

  grantAccess: (id: string, userId: string, token: string) =>
    api.post<void>(`/projects/${id}/access`, { userId }, token),

  // Congela o cronograma atual como linha de base (PMBOK).
  setBaseline: (id: string, token: string) =>
    api.post<ProjectDto>(`/projects/${id}/baseline`, {}, token),
};

// ── Organizations (clientes/fornecedores — dados mestres) ──────────────────────

export const organizationsApi = {
  list: (token: string) =>
    api.get<OrganizationDto[]>('/organizations', token),

  get: (id: string, token: string) =>
    api.get<OrganizationDetailDto>(`/organizations/${id}`, token),

  create: (data: Record<string, unknown>, token: string) =>
    api.post<OrganizationDto>('/organizations', data, token),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    api.patch<OrganizationDetailDto>(`/organizations/${id}`, data, token),

  // Best-effort: returns { enriched: false } offline/on failure — never throws server-side.
  enrich: (cnpj: string, token: string) =>
    api.get<EnrichmentResultDto>(`/organizations/enrich/${encodeURIComponent(cnpj)}`, token),

  addRole: (id: string, type: string, token: string) =>
    api.post<OrgRoleDto>(`/organizations/${id}/roles`, { type }, token),

  removeRole: (id: string, type: string, token: string) =>
    api.delete<void>(`/organizations/${id}/roles/${type}`, token),

  addAddress: (id: string, data: Record<string, unknown>, token: string) =>
    api.post<OrgAddressDto>(`/organizations/${id}/addresses`, data, token),

  updateAddress: (id: string, addressId: string, data: Record<string, unknown>, token: string) =>
    api.patch<OrgAddressDto>(`/organizations/${id}/addresses/${addressId}`, data, token),

  removeAddress: (id: string, addressId: string, token: string) =>
    api.delete<void>(`/organizations/${id}/addresses/${addressId}`, token),

  saveCustomerProfile: (id: string, data: Record<string, unknown>, token: string) =>
    api.patch<OrgCustomerProfileDto>(`/organizations/${id}/customer-profile`, data, token),

  addProductService: (id: string, productServiceId: string, token: string) =>
    api.post<{ id: string; name: string }>(`/organizations/${id}/product-services`, { productServiceId }, token),

  removeProductService: (id: string, productServiceId: string, token: string) =>
    api.delete<void>(`/organizations/${id}/product-services/${productServiceId}`, token),
};

// ── Taxonomies (setores, origens, escada — config só ADMIN) ────────────────────

export const taxonomiesApi = {
  list: (kind: TaxonomyKind, token: string, includeInactive = false) =>
    api.get<TaxonomyDto[]>(`/taxonomies/${kind}${includeInactive ? '?includeInactive=true' : ''}`, token),

  create: (kind: TaxonomyKind, name: string, token: string) =>
    api.post<TaxonomyDto>(`/taxonomies/${kind}`, { name }, token),

  update: (kind: TaxonomyKind, id: string, data: Record<string, unknown>, token: string) =>
    api.patch<TaxonomyDto>(`/taxonomies/${kind}/${id}`, data, token),

  remove: (kind: TaxonomyKind, id: string, token: string) =>
    api.delete<void>(`/taxonomies/${kind}/${id}`, token),

  reorder: (kind: TaxonomyKind, items: Array<{ id: string; order: number }>, token: string) =>
    api.patch<void>(`/taxonomies/${kind}/reorder`, { items }, token),
};

// ── Contacts (pessoas + vínculos com organizações) ─────────────────────────────

export const contactsApi = {
  list: (token: string, params?: { orgId?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.orgId) qs.set('orgId', params.orgId);
    if (params?.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ContactListItemDto[]>(`/contacts${suffix}`, token);
  },

  get: (id: string, token: string) =>
    api.get<ContactDetailDto>(`/contacts/${id}`, token),

  create: (data: Record<string, unknown>, token: string) =>
    api.post<ContactListItemDto>('/contacts', data, token),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    api.patch<ContactListItemDto>(`/contacts/${id}`, data, token),

  remove: (id: string, token: string) =>
    api.delete<void>(`/contacts/${id}`, token),

  addLink: (id: string, data: Record<string, unknown>, token: string) =>
    api.post<ContactLinkDto>(`/contacts/${id}/links`, data, token),

  updateLink: (id: string, linkId: string, data: Record<string, unknown>, token: string) =>
    api.patch<ContactLinkDto>(`/contacts/${id}/links/${linkId}`, data, token),

  removeLink: (id: string, linkId: string, token: string) =>
    api.delete<void>(`/contacts/${id}/links/${linkId}`, token),
};

// ── Pipelines (funil — config só ADMIN) ────────────────────────────────────────

export const pipelinesApi = {
  list: (token: string) =>
    api.get<PipelineDto[]>('/pipelines', token),

  get: (id: string, token: string) =>
    api.get<PipelineDto>(`/pipelines/${id}`, token),

  summary: (id: string, token: string) =>
    api.get<PipelineSummaryDto>(`/pipelines/${id}/summary`, token),

  create: (data: Record<string, unknown>, token: string) =>
    api.post<PipelineDto>('/pipelines', data, token),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    api.patch<PipelineDto>(`/pipelines/${id}`, data, token),

  remove: (id: string, token: string) =>
    api.delete<void>(`/pipelines/${id}`, token),

  addStage: (id: string, data: Record<string, unknown>, token: string) =>
    api.post<unknown>(`/pipelines/${id}/stages`, data, token),

  updateStage: (id: string, stageId: string, data: Record<string, unknown>, token: string) =>
    api.patch<unknown>(`/pipelines/${id}/stages/${stageId}`, data, token),

  removeStage: (id: string, stageId: string, token: string) =>
    api.delete<void>(`/pipelines/${id}/stages/${stageId}`, token),

  reorderStages: (id: string, items: Array<{ id: string; order: number }>, token: string) =>
    api.patch<void>(`/pipelines/${id}/stages/reorder`, { items }, token),
};

// ── Oportunidades (escrita só ADMIN) ───────────────────────────────────────────

export const opportunitiesApi = {
  list: (pipelineId: string, token: string) =>
    api.get<OpportunityDto[]>(`/opportunities?pipelineId=${pipelineId}`, token),

  listByOrg: (orgId: string, token: string) =>
    api.get<OpportunityDto[]>(`/opportunities?orgId=${orgId}`, token),

  create: (data: Record<string, unknown>, token: string) =>
    api.post<OpportunityDto>('/opportunities', data, token),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    api.patch<OpportunityDto>(`/opportunities/${id}`, data, token),

  move: (id: string, stageId: string, token: string, lostReason?: string) =>
    api.patch<OpportunityDto>(`/opportunities/${id}/move`, { stageId, lostReason }, token),

  freeze: (id: string, token: string) =>
    api.patch<OpportunityDto>(`/opportunities/${id}/freeze`, {}, token),

  unfreeze: (id: string, token: string) =>
    api.patch<OpportunityDto>(`/opportunities/${id}/unfreeze`, {}, token),

  reorder: (stageId: string, items: Array<{ id: string; order: number }>, token: string) =>
    api.patch<void>(`/opportunities/stages/${stageId}/reorder`, { items }, token),

  remove: (id: string, token: string) =>
    api.delete<void>(`/opportunities/${id}`, token),
};

// ── Interações (timeline do CRM — escrita só ADMIN) ────────────────────────────

export const interactionsApi = {
  list: (orgId: string, token: string) =>
    api.get<InteractionDto[]>(`/interactions?orgId=${orgId}`, token),

  create: (data: Record<string, unknown>, token: string) =>
    api.post<InteractionDto>('/interactions', data, token),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    api.patch<InteractionDto>(`/interactions/${id}`, data, token),

  remove: (id: string, token: string) =>
    api.delete<void>(`/interactions/${id}`, token),
};

// ── Atividades / follow-ups do CRM (escrita só ADMIN) ──────────────────────────

export const crmActivitiesApi = {
  list: (
    token: string,
    params?: {
      orgId?: string; opportunityId?: string; responsibleId?: string;
      due?: DueFilter; status?: ActivityStatus;
    },
  ) => {
    const qs = new URLSearchParams();
    if (params?.orgId) qs.set('orgId', params.orgId);
    if (params?.opportunityId) qs.set('opportunityId', params.opportunityId);
    if (params?.responsibleId) qs.set('responsibleId', params.responsibleId);
    if (params?.due) qs.set('due', params.due);
    if (params?.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<CrmActivityDto[]>(`/crm/activities${suffix}`, token);
  },

  create: (data: Record<string, unknown>, token: string) =>
    api.post<CrmActivityDto>('/crm/activities', data, token),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    api.patch<CrmActivityDto>(`/crm/activities/${id}`, data, token),

  remove: (id: string, token: string) =>
    api.delete<void>(`/crm/activities/${id}`, token),
};

// ── Usuários (leitura: ADMIN/PADRAO · escrita: ADMIN) ────────────────────────────────────────────────────

export const usersApi = {
  // Lista "achatada" (sem paginação) — usada pelos seletores de pessoa
  // (equipe do TAP, responsável de tarefa, atribuição do CRM). O teto de 100
  // cobre qualquer headcount realista da empresa; a tabela de Usuários usa
  // listPage() abaixo, com paginação de verdade.
  list: (token: string) =>
    api.get<PaginatedResult<UserDto>>('/users?limit=100', token).then((d) => d.items ?? []),

  listPage: (params: { page: number; limit: number }, token: string) =>
    api.get<PaginatedResult<UserDto>>(`/users?page=${params.page}&limit=${params.limit}`, token),

  create: (data: Record<string, unknown>, token: string) =>
    api.post<UserDto>('/users', data, token),

  update: (id: string, data: Record<string, unknown>, token: string) =>
    api.patch<UserDto>(`/users/${id}`, data, token),

  resetPassword: (id: string, newPassword: string, token: string) =>
    api.patch<void>(`/users/${id}/reset-password`, { newPassword }, token),

  projectAccess: (id: string, token: string) =>
    api.get<UserProjectAccessDto[]>(`/users/${id}/project-access`, token),

  grantProjectAccess: (projectId: string, userId: string, token: string) =>
    api.post<void>(`/projects/${projectId}/access`, { userId }, token),

  revokeProjectAccess: (projectId: string, userId: string, token: string) =>
    api.delete<void>(`/projects/${projectId}/access/${userId}`, token),
};

// ── Busca global (command palette ⌘K) ─────────────────────────────────────────

export const searchApi = {
  global: (q: string, token: string) =>
    api.get<SearchResultDto[]>(`/search?q=${encodeURIComponent(q)}`, token),
};

// ── Estoque (cadastro de itens) ───────────────────────────────────────────────

export const stockApi = {
  listItems: (
    token: string,
    filter: { search?: string; categoryId?: string; status?: string } = {},
  ) => {
    const qs = new URLSearchParams();
    if (filter.search) qs.set('search', filter.search);
    if (filter.categoryId) qs.set('categoryId', filter.categoryId);
    if (filter.status) qs.set('status', filter.status);
    const suffix = qs.toString();
    return api.get<StockItemDto[]>(`/stock${suffix ? `?${suffix}` : ''}`, token);
  },

  createItem: (data: Record<string, unknown>, token: string) =>
    api.post<StockItemDto>('/stock', data, token),

  updateItem: (id: string, data: Record<string, unknown>, token: string) =>
    api.patch<StockItemDto>(`/stock/${id}`, data, token),

  removeItem: (id: string, token: string) => api.delete<void>(`/stock/${id}`, token),

  listCategories: (token: string) => api.get<StockCategoryDto[]>('/stock/categories', token),

  createCategory: (name: string, token: string) =>
    api.post<StockCategoryDto>('/stock/categories', { name }, token),

  updateCategory: (id: string, data: { name?: string; isActive?: boolean }, token: string) =>
    api.patch<StockCategoryDto>(`/stock/categories/${id}`, data, token),

  removeCategory: (id: string, token: string) =>
    api.delete<void>(`/stock/categories/${id}`, token),
};

// ── Checklist de recursos do TAP ──────────────────────────────────────────────

export const charterEquipmentApi = {
  list: (projectId: string, token: string) =>
    api.get<CharterEquipmentDto[]>(`/projects/${projectId}/charter/equipment`, token),

  add: (projectId: string, stockItemId: string, token: string) =>
    api.post<CharterEquipmentDto>(
      `/projects/${projectId}/charter/equipment`,
      { stockItemId },
      token,
    ),

  update: (
    projectId: string,
    id: string,
    data: { checked?: boolean; quantity?: number },
    token: string,
  ) => api.patch<CharterEquipmentDto>(`/projects/${projectId}/charter/equipment/${id}`, data, token),

  remove: (projectId: string, id: string, token: string) =>
    api.delete<void>(`/projects/${projectId}/charter/equipment/${id}`, token),
};

// ── Anotações pessoais ────────────────────────────────────────────────────────
//
// ⚠️ Não existe (e não deve passar a existir) parâmetro de usuário aqui. A API
// resolve o dono pelo token — é o que torna a anotação privada, inclusive do
// ADMIN. Ver a seção de controle de acesso no CLAUDE.md.

export const notesApi = {
  list: (token: string) => api.get<NoteListItemDto[]>('/notes', token),

  get: (id: string, token: string) => api.get<NoteDto>(`/notes/${id}`, token),

  create: (data: { title?: string; contentHtml?: string }, token: string) =>
    api.post<NoteDto>('/notes', data, token),

  update: (
    id: string,
    data: { title?: string; contentHtml?: string; pinned?: boolean },
    token: string,
  ) => api.patch<NoteDto>(`/notes/${id}`, data, token),

  remove: (id: string, token: string) => api.delete<void>(`/notes/${id}`, token),
};
