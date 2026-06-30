'use client';

// Liga os eventos de edição da SVAR Gantt aos endpoints do ERP (persistência).
// Isola toda a I/O do componente de apresentação.

import { useEffect, useRef, type MutableRefObject } from 'react';
import { tasksApi, milestonesApi } from '@/lib/api-hooks';
import { isMilestoneId, stripMs, progressToStatus, type GanttLink } from './gantt-mapping';

interface Options {
  editable: boolean;
  projectId: string;
  token: string;
  links: GanttLink[];
  onError: () => void;
}

interface PersistenceHandles {
  // Abre o menu de contexto da SVAR (ligado ao onContextMenu do container).
  menuHandler: MutableRefObject<((e: any) => void) | null>;
}

export function useGanttPersistence(api: any, opts: Options): PersistenceHandles {
  const { editable, projectId, token, links, onError } = opts;

  // Mapas de reconciliação: ids gerados pela UI → ids reais do backend.
  const taskIdMap = useRef(new Map<string, string>());
  const linkIdMap = useRef(new Map<string, string>());
  const linkTarget = useRef(new Map<string, string>());
  const menuHandler = useRef<((e: any) => void) | null>(null);
  // Guarda a instância de api já religada (sobrevive a remontagens do Gantt).
  const wiredApi = useRef<any>(null);

  // Mantém o alvo (sucessora) de cada link conhecido para montar a URL de remoção.
  useEffect(() => {
    for (const l of links) linkTarget.current.set(String(l.id), String(l.target));
  }, [links]);

  useEffect(() => {
    if (!api || !editable || wiredApi.current === api) return;
    wiredApi.current = api;

    const resolveTaskId = (id: unknown) => taskIdMap.current.get(String(id)) ?? String(id);

    // Pai atual da tarefa na store (0 = raiz → null no backend).
    const currentParentId = (id: unknown): string | null => {
      const parent = api.getTask?.(id)?.parent;
      return parent && parent !== 0 ? resolveTaskId(parent) : null;
    };

    api.on('update-task', (ev: any) => {
      if (ev.inProgress) return;
      const t = ev.task ?? {};

      if (isMilestoneId(ev.id)) {
        const data: Record<string, unknown> = {};
        if (t.text !== undefined) data.title = t.text;
        if (t.start) data.date = new Date(t.start).toISOString();
        if (t.progress !== undefined) data.reached = t.progress >= 100;
        if (Object.keys(data).length === 0) return;
        milestonesApi.update(projectId, stripMs(ev.id), data, token).catch(onError);
        return;
      }

      const data: Record<string, unknown> = {};
      if (t.text !== undefined) data.title = t.text;
      if (t.start) data.startDate = new Date(t.start).toISOString();
      if (t.end) data.dueDate = new Date(t.end).toISOString();
      if (t.progress !== undefined) data.status = progressToStatus(t.progress);
      if (Object.keys(data).length === 0) return;
      tasksApi.update(projectId, resolveTaskId(ev.id), data, token).catch(onError);
    });

    api.on('add-task', async (ev: any) => {
      if (isMilestoneId(ev.id)) return;
      const t = ev.task ?? {};
      try {
        const parentId = currentParentId(ev.id);
        const created = await tasksApi.create(
          projectId,
          {
            title: t.text || 'Nova atividade',
            status: 'TODO',
            startDate: t.start ? new Date(t.start).toISOString() : undefined,
            dueDate: t.end ? new Date(t.end).toISOString() : undefined,
            ...(parentId ? { parentId } : {}),
          },
          token,
        );
        if (ev.id != null) taskIdMap.current.set(String(ev.id), created.id);
      } catch { onError(); }
    });

    // Reparentar (arrastar para dentro / indentar) → persiste o novo pai.
    const persistParent = (ev: any) => {
      if (ev.inProgress || isMilestoneId(ev.id)) return;
      tasksApi
        .update(projectId, resolveTaskId(ev.id), { parentId: currentParentId(ev.id) }, token)
        .catch(onError);
    };
    api.on('move-task', persistParent);
    api.on('indent-task', persistParent);

    api.on('delete-task', (ev: any) => {
      if (isMilestoneId(ev.id)) {
        milestonesApi.remove(projectId, stripMs(ev.id), token).catch(onError);
        return;
      }
      tasksApi.remove(projectId, resolveTaskId(ev.id), token).catch(onError);
    });

    api.on('add-link', async (ev: any) => {
      const link = ev.link ?? {};
      if (isMilestoneId(link.source) || isMilestoneId(link.target)) return;
      const predecessorId = resolveTaskId(link.source);
      const successorId = resolveTaskId(link.target);
      try {
        const dep = (await tasksApi.addDependency(
          projectId, successorId, predecessorId, token,
        )) as { id?: string };
        if (ev.id != null) {
          if (dep?.id) linkIdMap.current.set(String(ev.id), dep.id);
          linkTarget.current.set(String(ev.id), successorId);
        }
      } catch { onError(); }
    });

    api.on('delete-link', (ev: any) => {
      const depId = linkIdMap.current.get(String(ev.id)) ?? String(ev.id);
      const taskId = linkTarget.current.get(String(ev.id)) ?? '_';
      tasksApi.removeDependency(projectId, taskId, depId, token).catch(onError);
    });
  }, [api, editable, projectId, token, onError]);

  return { menuHandler };
}
