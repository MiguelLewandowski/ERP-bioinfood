import { describe, it, expect } from 'vitest';
import type { TaskDto, WbsNodeDto } from '@bioinfood/shared';
import { buildWbsIndex, computeWbsRollup } from './project-wbs';

function makeNode(overrides: Partial<WbsNodeDto> = {}): WbsNodeDto {
  return {
    id: 'n1',
    projectId: 'p1',
    parentId: null,
    code: '1',
    title: 'Pacote',
    owner: null,
    readyCriteria: null,
    outputs: null,
    order: 0,
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 't1',
    title: 'Extração',
    status: 'TODO',
    wbsNode: null,
    deletedAt: null,
    ...overrides,
  } as unknown as TaskDto;
}

function inNode(id: string): TaskDto['wbsNode'] {
  return { id, code: '1', title: 'Pacote' };
}

describe('computeWbsRollup', () => {
  it('should count the tasks linked directly to a package', () => {
    const nodes = [makeNode({ id: 'n1' })];
    const tasks = [
      makeTask({ id: 't1', status: 'DONE', wbsNode: inNode('n1') }),
      makeTask({ id: 't2', status: 'TODO', wbsNode: inNode('n1') }),
    ];

    const rollup = computeWbsRollup(nodes, tasks);

    expect(rollup.get('n1')).toEqual({ total: 2, done: 1, progress: 50 });
  });

  it('should roll the descendants up into the parent package', () => {
    const nodes = [
      makeNode({ id: 'n1', code: '1' }),
      makeNode({ id: 'n1a', code: '1.1', parentId: 'n1' }),
      makeNode({ id: 'n1a1', code: '1.1.1', parentId: 'n1a' }),
    ];
    const tasks = [
      makeTask({ id: 't1', status: 'DONE', wbsNode: inNode('n1a1') }),
      makeTask({ id: 't2', status: 'TODO', wbsNode: inNode('n1a') }),
      makeTask({ id: 't3', status: 'DONE', wbsNode: inNode('n1') }),
    ];

    const rollup = computeWbsRollup(nodes, tasks);

    expect(rollup.get('n1a1')).toEqual({ total: 1, done: 1, progress: 100 });
    expect(rollup.get('n1a')).toEqual({ total: 2, done: 1, progress: 50 });
    expect(rollup.get('n1')).toEqual({ total: 3, done: 2, progress: 67 });
  });

  it('should not count sibling packages into each other', () => {
    const nodes = [makeNode({ id: 'n1' }), makeNode({ id: 'n2', code: '2' })];
    const tasks = [makeTask({ id: 't1', status: 'DONE', wbsNode: inNode('n1') })];

    const rollup = computeWbsRollup(nodes, tasks);

    expect(rollup.get('n1')?.total).toBe(1);
    expect(rollup.get('n2')).toEqual({ total: 0, done: 0, progress: 0 });
  });

  it('should ignore soft deleted tasks', () => {
    const nodes = [makeNode({ id: 'n1' })];
    const tasks = [
      makeTask({ id: 't1', status: 'DONE', wbsNode: inNode('n1') }),
      makeTask({ id: 't2', status: 'DONE', wbsNode: inNode('n1'), deletedAt: '2026-07-01T00:00:00.000Z' }),
    ];

    const rollup = computeWbsRollup(nodes, tasks);

    expect(rollup.get('n1')).toEqual({ total: 1, done: 1, progress: 100 });
  });

  it('should ignore tasks without a package or pointing to an unknown one', () => {
    const nodes = [makeNode({ id: 'n1' })];
    const tasks = [
      makeTask({ id: 't1', wbsNode: null }),
      makeTask({ id: 't2', wbsNode: inNode('ghost') }),
    ];

    const rollup = computeWbsRollup(nodes, tasks);

    expect(rollup.get('n1')).toEqual({ total: 0, done: 0, progress: 0 });
  });

  it('should give every package a rollup even when the project has no tasks', () => {
    const rollup = computeWbsRollup([makeNode({ id: 'n1' })], []);

    expect(rollup.get('n1')).toEqual({ total: 0, done: 0, progress: 0 });
  });

  it('should treat a node whose parent is missing as a root', () => {
    const nodes = [makeNode({ id: 'orphan', parentId: 'deleted-node' })];
    const tasks = [makeTask({ id: 't1', status: 'DONE', wbsNode: inNode('orphan') })];

    const rollup = computeWbsRollup(nodes, tasks);

    expect(rollup.get('orphan')).toEqual({ total: 1, done: 1, progress: 100 });
  });

  it('should not hang when parentId forms a cycle', () => {
    const nodes = [
      makeNode({ id: 'a', parentId: 'b' }),
      makeNode({ id: 'b', parentId: 'a' }),
    ];
    const tasks = [makeTask({ id: 't1', status: 'DONE', wbsNode: inNode('a') })];

    const rollup = computeWbsRollup(nodes, tasks);

    expect(rollup.get('a')?.done).toBeGreaterThan(0);
  });
});

describe('buildWbsIndex', () => {
  it('should map every node to its level 1 package', () => {
    const nodes = [
      makeNode({ id: 'n1' }),
      makeNode({ id: 'n1a', parentId: 'n1' }),
      makeNode({ id: 'n1a1', parentId: 'n1a' }),
      makeNode({ id: 'n2', parentId: null }),
    ];

    const { rootOf } = buildWbsIndex(nodes);

    expect(rootOf.get('n1')).toBe('n1');
    expect(rootOf.get('n1a')).toBe('n1');
    expect(rootOf.get('n1a1')).toBe('n1');
    expect(rootOf.get('n2')).toBe('n2');
  });

  it('should not link a parent that is absent from the list', () => {
    const { parentOf, rootOf } = buildWbsIndex([makeNode({ id: 'orphan', parentId: 'gone' })]);

    expect(parentOf.has('orphan')).toBe(false);
    expect(rootOf.get('orphan')).toBe('orphan');
  });
});
