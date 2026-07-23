// Agrega o uso de POPs de um projeto a partir das tarefas. Função pura — recebe
// as tarefas que a página já buscou e devolve o recorte por POP. Não há endpoint
// dedicado: `GET /projects/:id/tasks` já traz `pops` em cada tarefa.

import type { TaskDto, TaskStatus } from '@bioinfood/shared';

export interface PopTaskUsage {
  taskId: string;
  taskTitle: string;
  status: TaskStatus;
  assigneeName: string | null;
  versionNumber: number;
}

export interface PopUsage {
  popId: string;
  title: string;
  /** Versões distintas em uso, da mais nova para a mais antiga. */
  versions: number[];
  tasks: PopTaskUsage[];
  doneCount: number;
}

export interface ProjectMethodology {
  pops: PopUsage[];
  /** Tarefas sem nenhuma POP vinculada — o trabalho sem procedimento registrado. */
  tasksWithoutPop: TaskDto[];
  totalTasks: number;
  tasksWithPop: number;
  /** Percentual de tarefas com ao menos uma POP (0–100, inteiro). */
  coverage: number;
}

export function computeMethodology(tasks: TaskDto[]): ProjectMethodology {
  const active = tasks.filter((t) => !t.deletedAt);
  const byPop = new Map<string, PopUsage>();
  const withoutPop: TaskDto[] = [];

  for (const task of active) {
    if (task.pops.length === 0) {
      withoutPop.push(task);
      continue;
    }

    for (const link of task.pops) {
      let entry = byPop.get(link.pop.id);
      if (!entry) {
        entry = { popId: link.pop.id, title: link.pop.title, versions: [], tasks: [], doneCount: 0 };
        byPop.set(link.pop.id, entry);
      }
      if (!entry.versions.includes(link.versionNumber)) entry.versions.push(link.versionNumber);
      entry.tasks.push({
        taskId: task.id,
        taskTitle: task.title,
        status: task.status,
        assigneeName: task.assignee?.name ?? null,
        versionNumber: link.versionNumber,
      });
      if (task.status === 'DONE') entry.doneCount += 1;
    }
  }

  const pops = Array.from(byPop.values())
    .map((p) => ({
      ...p,
      versions: [...p.versions].sort((a, b) => b - a),
      tasks: [...p.tasks].sort((a, b) => a.taskTitle.localeCompare(b.taskTitle)),
    }))
    // Mais usada primeiro; empate resolvido pelo título para a ordem ser estável.
    .sort((a, b) => b.tasks.length - a.tasks.length || a.title.localeCompare(b.title));

  const tasksWithPop = active.length - withoutPop.length;

  return {
    pops,
    tasksWithoutPop: withoutPop,
    totalTasks: active.length,
    tasksWithPop,
    coverage: active.length === 0 ? 0 : Math.round((tasksWithPop / active.length) * 100),
  };
}

/**
 * POPs usadas em mais de uma versão dentro do mesmo projeto.
 *
 * Importa para biotech: duas tarefas seguindo revisões diferentes do mesmo
 * procedimento é divergência de método, e sem isso ninguém percebe.
 */
export function popsWithVersionDrift(pops: PopUsage[]): PopUsage[] {
  return pops.filter((p) => p.versions.length > 1);
}
