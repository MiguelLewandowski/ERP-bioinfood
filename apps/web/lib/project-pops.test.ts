import { describe, it, expect } from 'vitest';
import type { TaskDto } from '@bioinfood/shared';
import { computeMethodology, popsWithVersionDrift } from './project-pops';

function makeTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 't1',
    title: 'Extração',
    status: 'TODO',
    assignee: null,
    pops: [],
    requiresSOP: true,
    deletedAt: null,
    ...overrides,
  } as unknown as TaskDto;
}

function popLink(popId: string, title: string, versionNumber: number) {
  return { id: `link-${popId}-${versionNumber}`, popVersionId: 'v', pop: { id: popId, title }, versionNumber };
}

describe('computeMethodology', () => {
  it('should group the tasks that use each POP', () => {
    const result = computeMethodology([
      makeTask({ id: 't1', title: 'Extração', pops: [popLink('pop-1', 'POP de extração', 2)] as TaskDto['pops'] }),
      makeTask({ id: 't2', title: 'Secagem', pops: [popLink('pop-1', 'POP de extração', 2)] as TaskDto['pops'] }),
    ]);

    expect(result.pops).toHaveLength(1);
    expect(result.pops[0].title).toBe('POP de extração');
    expect(result.pops[0].tasks.map((t) => t.taskTitle)).toEqual(['Extração', 'Secagem']);
  });

  it('should rank the most used POP first', () => {
    const result = computeMethodology([
      makeTask({ id: 't1', pops: [popLink('pop-1', 'Pouco usada', 1)] as TaskDto['pops'] }),
      makeTask({ id: 't2', pops: [popLink('pop-2', 'Muito usada', 1)] as TaskDto['pops'] }),
      makeTask({ id: 't3', pops: [popLink('pop-2', 'Muito usada', 1)] as TaskDto['pops'] }),
    ]);

    expect(result.pops.map((p) => p.title)).toEqual(['Muito usada', 'Pouco usada']);
  });

  it('should list the tasks that have no POP at all', () => {
    const result = computeMethodology([
      makeTask({ id: 't1', title: 'Com POP', pops: [popLink('pop-1', 'POP', 1)] as TaskDto['pops'] }),
      makeTask({ id: 't2', title: 'Sem POP' }),
    ]);

    expect(result.tasksWithoutPop.map((t) => t.title)).toEqual(['Sem POP']);
    expect(result.coverage).toBe(50);
  });

  it('should count a task once even when it uses several POPs', () => {
    const result = computeMethodology([
      makeTask({ id: 't1', pops: [popLink('pop-1', 'A', 1), popLink('pop-2', 'B', 1)] as TaskDto['pops'] }),
    ]);

    expect(result.tasksWithPop).toBe(1);
    expect(result.coverage).toBe(100);
    expect(result.pops).toHaveLength(2);
  });

  it('should count how many of a POP tasks are already done', () => {
    const result = computeMethodology([
      makeTask({ id: 't1', status: 'DONE', pops: [popLink('pop-1', 'POP', 1)] as TaskDto['pops'] }),
      makeTask({ id: 't2', status: 'TODO', pops: [popLink('pop-1', 'POP', 1)] as TaskDto['pops'] }),
    ]);

    expect(result.pops[0].doneCount).toBe(1);
  });

  it('should ignore deleted tasks', () => {
    const result = computeMethodology([
      makeTask({ id: 't1', deletedAt: '2026-07-01T00:00:00.000Z', pops: [popLink('pop-1', 'POP', 1)] as TaskDto['pops'] }),
    ]);

    expect(result.pops).toHaveLength(0);
    expect(result.totalTasks).toBe(0);
    expect(result.coverage).toBe(0);
  });

  it('should not divide by zero on an empty project', () => {
    expect(computeMethodology([]).coverage).toBe(0);
  });
});

describe('popsWithVersionDrift', () => {
  // Duas tarefas seguindo revisões diferentes do mesmo procedimento é
  // divergência de método — precisa saltar aos olhos.
  it('should flag a POP used in more than one version', () => {
    const { pops } = computeMethodology([
      makeTask({ id: 't1', pops: [popLink('pop-1', 'POP', 1)] as TaskDto['pops'] }),
      makeTask({ id: 't2', pops: [popLink('pop-1', 'POP', 3)] as TaskDto['pops'] }),
    ]);

    const drift = popsWithVersionDrift(pops);
    expect(drift).toHaveLength(1);
    expect(drift[0].versions).toEqual([3, 1]);
  });

  it('should not flag a POP used in a single version', () => {
    const { pops } = computeMethodology([
      makeTask({ id: 't1', pops: [popLink('pop-1', 'POP', 2)] as TaskDto['pops'] }),
      makeTask({ id: 't2', pops: [popLink('pop-1', 'POP', 2)] as TaskDto['pops'] }),
    ]);

    expect(popsWithVersionDrift(pops)).toHaveLength(0);
  });
});

/**
 * A cobertura contava tarefa administrativa ("fechar contrato") como trabalho
 * sem procedimento — o denominador media o tamanho do backlog, não a aderência
 * ao método.
 *
 * O default `true` no banco é o que garante que o número NÃO se mexe sozinho no
 * deploy: só encolhe quando alguém classifica.
 */
describe('computeMethodology — requiresSOP', () => {
  it('should keep an unclassified task in the denominator', () => {
    const result = computeMethodology([
      makeTask({ id: 't1', pops: [popLink('pop-1', 'POP', 1)] as TaskDto['pops'] }),
      makeTask({ id: 't2' }),
    ]);

    expect(result.totalTasks).toBe(2);
    expect(result.coverage).toBe(50);
    expect(result.notApplicable).toBe(0);
  });

  it('should drop a non-applicable task from both sides of the ratio', () => {
    const result = computeMethodology([
      makeTask({ id: 't1', pops: [popLink('pop-1', 'POP', 1)] as TaskDto['pops'] }),
      makeTask({ id: 't2', requiresSOP: false }),
    ]);

    expect(result.totalTasks).toBe(1);
    expect(result.tasksWithPop).toBe(1);
    expect(result.coverage).toBe(100);
  });

  it('should report how many tasks were excluded, so the denominator is explainable', () => {
    const result = computeMethodology([
      makeTask({ id: 't1', pops: [popLink('pop-1', 'POP', 1)] as TaskDto['pops'] }),
      makeTask({ id: 't2', requiresSOP: false }),
      makeTask({ id: 't3', requiresSOP: false }),
    ]);

    expect(result.notApplicable).toBe(2);
  });

  // Um item marcado como não aplicável não é "trabalho sem procedimento": ele
  // não pode continuar aparecendo na lista que cobra POP.
  it('should not list a non-applicable task as missing a POP', () => {
    const result = computeMethodology([
      makeTask({ id: 't1', title: 'Fechar contrato', requiresSOP: false }),
    ]);

    expect(result.tasksWithoutPop).toHaveLength(0);
  });

  it('should return zero coverage when every task is non-applicable', () => {
    const result = computeMethodology([
      makeTask({ id: 't1', requiresSOP: false }),
    ]);

    expect(result.totalTasks).toBe(0);
    expect(result.coverage).toBe(0);
  });
});
