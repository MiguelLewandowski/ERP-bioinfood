import { api } from './api';
import type {
  TaskDto,
  TaskChecklistItemDto,
  RiskDto,
  MilestoneDto,
  WbsNodeDto,
  CharterDto,
  ProjectDto,
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

  addDependency: (projectId: string, taskId: string, predecessorId: string, token: string) =>
    api.post<unknown>(`/projects/${projectId}/tasks/${taskId}/dependencies`, { predecessorId }, token),

  removeDependency: (projectId: string, taskId: string, depId: string, token: string) =>
    api.delete<void>(`/projects/${projectId}/tasks/${taskId}/dependencies/${depId}`, token),
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
    api.patch<CharterDto>(`/projects/${projectId}/charter`, data, token),

  approve: (projectId: string, token: string) =>
    api.post<CharterDto>(`/projects/${projectId}/charter/approve`, {}, token),
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

  grantAccess: (id: string, userId: string, token: string) =>
    api.post<void>(`/projects/${id}/access`, { userId }, token),
};
