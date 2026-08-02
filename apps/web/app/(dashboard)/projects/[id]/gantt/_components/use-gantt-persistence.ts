'use client';

// Liga os eventos de edição da SVAR Gantt aos endpoints do ERP (persistência).
// Isola toda a I/O do componente de apresentação.

import { useEffect, useRef, type MutableRefObject } from 'react';
import type { MilestoneDto, TaskDto, TaskStatus } from '@bioinfood/shared';
import { hasTimeComponent } from '@/lib/dates';
import { taskOrderDelta } from '@/lib/task-order';
import { tasksApi, milestonesApi } from '@/lib/api-hooks';
import { useConfirm } from '@/components/providers/confirm-provider';
import {
  isMilestoneId, stripMs, progressToStatus, toPmbokDependencyType, toGanttDate,
  type GanttLink,
} from './gantt-mapping';

interface Options {
  editable: boolean;
  projectId: string;
  token: string;
  links: GanttLink[];
  // Todas as tarefas do projeto (não só as com data, que é o que o Gantt
  // mostra) — necessário para resequenciar `order` sem perder as sem data.
  tasks: TaskDto[];
  // Marcos, pelo mesmo motivo das tarefas: sem o valor conhecido do servidor não
  // há com o que comparar, e o PATCH vira escrita cega.
  milestones: MilestoneDto[];
  onError: () => void;
  // Abre o TaskFormDialog (o mesmo do Kanban/Backlog) no lugar do painel
  // nativo da SVAR — chamado só para tarefas; marcos continuam no editor nativo.
  onEditTask: (taskId: string) => void;
}

interface PersistenceHandles {
  // Abre o menu de contexto da SVAR (ligado ao onContextMenu do container).
  menuHandler: MutableRefObject<((e: any) => void) | null>;
}

// ─── comparação de campos para o PATCH condicional ─────────────────────────────

/**
 * O DIA de um campo de data, como 'YYYY-MM-DD', pelos componentes locais.
 *
 * Serve para duas coisas ao mesmo tempo: comparar (o que mudou de verdade) e
 * **gravar**. Desde que `buildGanttTasks` monta a store com `parseCalendarDate`,
 * as datas da SVAR são meia-noite LOCAL do dia certo — então extrair o dia pelos
 * componentes locais devolve o dia real, e é isso que vai para a API.
 *
 * O que NÃO fazer aqui: `toISOString()`. Meia-noite local em UTC-3 vira 03:00Z,
 * que é o erro que este incidente existe para eliminar.
 */
function dayKey(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Valor a enviar para a API a partir do `Date` da store.
 *
 * `keepTime` decide o formato, e vem de a tarefa ter hora **no servidor**:
 * arrastar uma barra move dias, não muda hora, então quem tinha hora continua
 * com ela e quem não tinha não ganha uma por causa de um arrastar.
 */
function toApiValue(value: unknown, keepTime: boolean): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return keepTime ? d.toISOString() : dayKey(d);
}

/**
 * Dia de calendário de um valor vindo da **API**, pela MESMA conversão que monta
 * a store (`toGanttDate`).
 *
 * `dayKey` sozinho não serve aqui: ele faz `new Date(string)`, e o ISO de
 * meia-noite UTC que a API devolve vira 21h do dia ANTERIOR em America/Sao_Paulo.
 * O snapshot ficava um dia atrás do que a store calcula para a mesma tarefa, os
 * dois nunca batiam, e o PATCH condicional se anulava: qualquer evento que
 * trouxesse `start`/`end` — inclusive renomear — reenviava as datas.
 *
 * Amarrar as duas pontas à mesma função é o que impede a divergência de voltar.
 */
function dtoDayKey(value: string | null): string | null {
  return value ? dayKey(toGanttDate(value)) : null;
}

interface TaskSnapshot {
  title: string;
  startDay: string | null;
  dueDay: string | null;
  status: TaskStatus;
  /** A tarefa tem hora de verdade? Decide o formato gravado. */
  startHasTime: boolean;
  dueHasTime: boolean;
}

function snapshotOf(task: TaskDto): TaskSnapshot {
  return {
    title: task.title,
    startDay: dtoDayKey(task.startDate),
    dueDay: dtoDayKey(task.dueDate),
    status: task.status,
    startHasTime: hasTimeComponent(task.startDate),
    dueHasTime: hasTimeComponent(task.dueDate),
  };
}

interface MilestoneSnapshot {
  title: string;
  day: string | null;
  reached: boolean;
}

// Deliberadamente separado do de tarefa, e não fundido numa abstração comum: as
// entidades têm campos diferentes (`dueDate`/`status` vs `date`/`reached`) e a
// fusão sairia pior que a duplicação.
function snapshotOfMilestone(m: MilestoneDto): MilestoneSnapshot {
  return { title: m.title, day: dtoDayKey(m.date), reached: m.reached };
}

export function useGanttPersistence(api: any, opts: Options): PersistenceHandles {
  const { editable, projectId, token, links, tasks, milestones, onError, onEditTask } = opts;
  const confirm = useConfirm();

  // Mapas de reconciliação: ids gerados pela UI → ids reais do backend.
  const taskIdMap = useRef(new Map<string, string>());
  const linkIdMap = useRef(new Map<string, string>());
  const linkTarget = useRef(new Map<string, string>());
  const menuHandler = useRef<((e: any) => void) | null>(null);
  // Guarda a instância de api já religada (sobrevive a remontagens do Gantt).
  const wiredApi = useRef<any>(null);
  // Lista completa (com e sem data) sempre disponível para o handler de reordenar,
  // sem precisar religar o listener a cada mudança de `tasks`.
  const allTasksRef = useRef<TaskDto[]>(tasks);
  allTasksRef.current = tasks;
  const allMilestonesRef = useRef<MilestoneDto[]>(milestones);
  allMilestonesRef.current = milestones;

  // Último valor que sabemos estar no servidor, por tarefa. Semeado sob demanda
  // a partir do DTO e atualizado a cada escrita — é contra ele que o handler
  // decide o que mudou de verdade.
  const lastPersisted = useRef(new Map<string, TaskSnapshot>());
  const lastPersistedMilestone = useRef(new Map<string, MilestoneSnapshot>());
  // `order` que sabemos estar gravado, por tarefa. Sem isto o segundo arrastar
  // compararia contra os `order` do DTO — que ficaram velhos no primeiro — e
  // poderia PULAR uma linha que precisava mudar.
  const lastKnownOrder = useRef(new Map<string, number>());

  // Mantém o alvo (sucessora) de cada link conhecido para montar a URL de remoção.
  useEffect(() => {
    for (const l of links) linkTarget.current.set(String(l.id), String(l.target));
  }, [links]);

  useEffect(() => {
    if (!api || !editable || wiredApi.current === api) return;
    wiredApi.current = api;

    // Confirmação antes de excluir — `intercept` roda antes da mutação ser
    // aplicada na store; retornar `false` (ou Promise<false>) cancela a ação.
    api.intercept('delete-task', (ev: any) => {
      // Grupo não é entidade: cancela antes de perguntar, senão a confirmação
      // promete uma exclusão que não vai acontecer.
      if (!isMilestoneId(ev.id) && !isRealTask(ev.id)) return false;
      const label = isMilestoneId(ev.id) ? 'este marco' : 'esta atividade';
      return confirm({
        title: `Excluir ${label}?`,
        description: 'Essa ação não pode ser desfeita.',
        confirmLabel: 'Excluir',
        variant: 'destructive',
      });
    });

    const resolveTaskId = (id: unknown) => taskIdMap.current.get(String(id)) ?? String(id);

    /**
     * A linha corresponde a uma tarefa que existe no backend?
     *
     * Guardar por PREFIXO (`ms-`) cobria marcos, mas não linhas de GRUPO: com o
     * `groupBy` da SVAR ligado, o cabeçalho de cada pacote da EAP é uma linha na
     * store com id gerado pela própria lib, que não segue convenção nossa. Sem
     * esta guarda, `persistOrder` mandava esses ids para `/tasks/reorder` e
     * `currentParentId` os gravava como `parentId` — escrita não controlada, a
     * mesma classe do `<Toolbar>` removido no incidente de fuso.
     *
     * Perguntar "isto é uma tarefa?" cobre marco, grupo e qualquer linha
     * sintética que venha a existir, sem depender de convenção de id.
     */
    const isRealTask = (id: unknown): boolean => {
      if (id == null || id === 0 || isMilestoneId(id)) return false;
      const key = String(id);
      // Recém-criada nesta sessão: já tem id real, mas `tasks` só reflete depois
      // do refresh do servidor.
      if (taskIdMap.current.has(key)) return true;
      const resolved = resolveTaskId(id);
      return allTasksRef.current.some((t) => t.id === resolved);
    };

    // Editor unificado: duplo-clique numa barra (ou "Editar" no menu de
    // contexto) dispara `show-editor`. Para tarefas, cancela o painel nativo
    // da SVAR (que não tem prioridade/responsável/story points/checklist) e
    // abre o mesmo TaskFormDialog do Kanban/Backlog. Marcos não são Task —
    // continuam no editor nativo, que já dá conta de nome/data/atingido.
    api.intercept('show-editor', (ev: any) => {
      if (isMilestoneId(ev.id)) return true;
      // Cabeçalho de pacote não tem o que editar — abrir o dialog para um id
      // que não é tarefa daria um modal vazio.
      if (!isRealTask(ev.id)) return false;
      onEditTask(resolveTaskId(ev.id));
      return false;
    });

    // Pai atual da tarefa na store (0 = raiz → null no backend).
    //
    // Com agrupamento ligado, o pai de uma tarefa de primeiro nível é a linha do
    // PACOTE, não outra tarefa. Gravar aquele id como `parentId` criaria uma
    // subtarefa de algo que não existe — por isso pai que não é tarefa vira
    // `null`, que é a verdade: a tarefa está na raiz.
    const currentParentId = (id: unknown): string | null => {
      const parent = api.getTask?.(id)?.parent;
      return isRealTask(parent) ? resolveTaskId(parent) : null;
    };

    api.on('update-task', (ev: any) => {
      if (ev.inProgress) return;
      const t = ev.task ?? {};

      if (isMilestoneId(ev.id)) {
        // PATCH condicional, pelo mesmo motivo do ramo de tarefa: a SVAR emite a
        // linha INTEIRA a cada `update-task`, então o guard `!== undefined` só
        // dizia "o campo veio no evento", não "o campo mudou" — renomear um
        // marco reenviava `date` e `reached` junto.
        const msId = stripMs(ev.id);
        const known = lastPersistedMilestone.current.get(msId)
          ?? (() => {
            const dto = allMilestonesRef.current.find((m) => m.id === msId);
            return dto ? snapshotOfMilestone(dto) : null;
          })();

        const next: MilestoneSnapshot = {
          title: t.text !== undefined ? t.text : known?.title ?? '',
          // `dayKey` pelos componentes LOCAIS: `Milestone.date` é coluna DATE
          // desde a migration de dia de calendário, e ISO com hora seria
          // truncado pelo banco em silêncio.
          day: t.start ? dayKey(t.start) : known?.day ?? null,
          // A SVAR trata marco como barra de progresso 0 ou 100 — a conversão
          // continua sendo essa, agora só comparada antes de sair.
          reached: t.progress !== undefined ? t.progress >= 100 : known?.reached ?? false,
        };

        const data: Record<string, unknown> = {};
        if (t.text !== undefined && next.title !== known?.title) data.title = next.title;
        if (t.start && next.day !== known?.day) data.date = next.day;
        if (t.progress !== undefined && next.reached !== known?.reached) data.reached = next.reached;

        if (Object.keys(data).length === 0) return;

        lastPersistedMilestone.current.set(msId, next);
        milestonesApi.update(projectId, msId, data, token).catch(onError);
        return;
      }

      // Linha de grupo (cabeçalho de pacote da EAP) não é Task: recalcular suas
      // datas ao mover um filho dispara `update-task` para ela também.
      if (!isRealTask(ev.id)) return;

      // PATCH condicional: a SVAR emite o objeto inteiro da tarefa a cada
      // `update-task`, não só o campo mexido. Enviar tudo fazia uma edição de
      // título reescrever também as datas — e com elas o `addDays` que existe só
      // para desenhar barra de duração zero (gantt-mapping.ts). Comparar com o
      // último valor conhecido do servidor é o que impede normalização de
      // exibição de virar dado. Ver docs/incidentes/timezone-cronograma.md §2.4.
      const taskId = resolveTaskId(ev.id);
      const known = lastPersisted.current.get(taskId)
        ?? (() => {
          const dto = allTasksRef.current.find((x) => x.id === taskId);
          return dto ? snapshotOf(dto) : null;
        })();

      const next: TaskSnapshot = {
        title: t.text !== undefined ? t.text : known?.title ?? '',
        startDay: t.start ? dayKey(t.start) : known?.startDay ?? null,
        dueDay: t.end ? dayKey(t.end) : known?.dueDay ?? null,
        status: t.progress !== undefined
          ? progressToStatus(t.progress)
          : known?.status ?? 'TODO',
        startHasTime: known?.startHasTime ?? false,
        dueHasTime: known?.dueHasTime ?? false,
      };

      const data: Record<string, unknown> = {};
      if (t.text !== undefined && next.title !== known?.title) data.title = next.title;
      if (t.start && next.startDay !== known?.startDay) {
        data.startDate = toApiValue(t.start, next.startHasTime);
      }
      if (t.end && next.dueDay !== known?.dueDay) {
        data.dueDate = toApiValue(t.end, next.dueHasTime);
      }
      if (t.progress !== undefined && next.status !== known?.status) data.status = next.status;

      if (Object.keys(data).length === 0) return;

      lastPersisted.current.set(taskId, next);
      tasksApi.update(projectId, taskId, data, token).catch(onError);
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
            startDate: t.start ? dayKey(t.start) ?? undefined : undefined,
            dueDate: t.end ? dayKey(t.end) ?? undefined : undefined,
            ...(parentId ? { parentId } : {}),
          },
          token,
        );
        if (ev.id != null) taskIdMap.current.set(String(ev.id), created.id);
        // Semeia o snapshot com o que acabou de ser gravado: sem isso, o
        // primeiro `update-task` da tarefa nova não teria com o que comparar e
        // reenviaria todos os campos.
        lastPersisted.current.set(created.id, snapshotOf(created));
      } catch { onError(); }
    });

    // Reparentar (arrastar para dentro / indentar) → persiste o novo pai.
    const persistParent = (ev: any) => {
      if (ev.inProgress || !isRealTask(ev.id)) return;
      tasksApi
        .update(projectId, resolveTaskId(ev.id), { parentId: currentParentId(ev.id) }, token)
        .catch(onError);
    };

    // Reordenar (arrastar uma tarefa acima/abaixo de outra, subir/descer, ou
    // reparentar) muda a posição visual na árvore — mas `order` é um campo
    // GLOBAL por projeto (mesmo padrão do Backlog: reordenar sempre resequencia
    // a lista toda), e o Gantt só exibe tarefas com data (buildGanttTasks
    // filtra por startDate+dueDate). Resequenciar só o que está visível no
    // Gantt, começando do zero, colidiria com o `order` das tarefas sem data.
    // Por isso: pega a nova ordem visual do subconjunto com data (`toArray()`,
    // já achatada pós-drop) e anexa as tarefas sem data depois, preservando a
    // ordem relativa que elas já tinham — um resequenciamento completo e
    // consistente com o que o Backlog grava.
    const persistOrder = (ev: any) => {
      if (ev.inProgress) return;
      const flat = api.getState().tasks.toArray() as Array<{ id: unknown }>;
      // `toArray()` devolve a árvore ACHATADA — com agrupamento ligado, isso
      // inclui os cabeçalhos de pacote. Filtrar só marcos deixava passar id de
      // grupo para `/tasks/reorder`, que gravaria ordem em tarefa inexistente.
      const orderedIds = flat.filter((t) => isRealTask(t.id)).map((t) => resolveTaskId(t.id));
      const orderedSet = new Set(orderedIds);
      const remainingIds = allTasksRef.current
        .filter((t) => !orderedSet.has(t.id))
        .map((t) => t.id);
      // A lista desejada continua COMPLETA (é o que mantém Gantt e Backlog
      // consistentes); só o que sai daqui para a API é que virou o delta.
      const desired = [...orderedIds, ...remainingIds];
      const items = taskOrderDelta(desired, (id) => (
        lastKnownOrder.current.get(id)
        ?? allTasksRef.current.find((t) => t.id === id)?.order
      ));

      // Arrastar e devolver ao lugar de origem não muda nada — e não deve
      // escrever nada.
      if (items.length === 0) return;

      for (const { id, order } of items) lastKnownOrder.current.set(id, order);
      tasksApi.reorder(projectId, items, token).catch(onError);
    };

    api.on('move-task', persistParent);
    api.on('move-task', persistOrder);
    api.on('indent-task', persistParent);
    api.on('indent-task', persistOrder);

    api.on('delete-task', (ev: any) => {
      if (isMilestoneId(ev.id)) {
        milestonesApi.remove(projectId, stripMs(ev.id), token).catch(onError);
        return;
      }
      if (!isRealTask(ev.id)) return;
      tasksApi.remove(projectId, resolveTaskId(ev.id), token).catch(onError);
    });

    api.on('add-link', async (ev: any) => {
      const link = ev.link ?? {};
      if (isMilestoneId(link.source) || isMilestoneId(link.target)) {
        // Marcos não são Task — a dependência não tem onde ser persistida.
        // Desfaz o link otimista que a SVAR já inseriu na store para não
        // deixar um vínculo "fantasma" (visível na tela, inexistente no
        // backend) que geraria confusão ao tentar removê-lo depois.
        if (ev.id != null) api.exec('delete-link', { id: ev.id });
        return;
      }
      const predecessorId = resolveTaskId(link.source);
      const successorId = resolveTaskId(link.target);
      const type = toPmbokDependencyType(link.type);
      try {
        const dep = (await tasksApi.addDependency(
          projectId, successorId, predecessorId, token, type, link.lag,
        )) as { id?: string };
        if (ev.id != null) {
          if (dep?.id) linkIdMap.current.set(String(ev.id), dep.id);
          linkTarget.current.set(String(ev.id), successorId);
        }
      } catch { onError(); }
    });

    api.on('delete-link', (ev: any) => {
      const key = String(ev.id);
      // Se o `add-link` correspondente ainda não resolveu (ou nunca chegou a
      // persistir, ex.: vínculo com marco), não há id real do backend — mas a
      // exclusão no backend é idempotente, então enviar o id efêmero da SVAR
      // não gera erro, só um no-op.
      const depId = linkIdMap.current.get(key) ?? key;
      const taskId = linkTarget.current.get(key) ?? '_';
      linkIdMap.current.delete(key);
      linkTarget.current.delete(key);
      tasksApi.removeDependency(projectId, taskId, depId, token).catch(onError);
    });
  }, [api, editable, projectId, token, onError, onEditTask, confirm]);

  return { menuHandler };
}
