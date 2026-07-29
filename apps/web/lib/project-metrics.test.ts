import { describe, expect, it } from 'vitest';
import type { MilestoneDto, RiskDto, StakeholderDto, TaskDto } from '@bioinfood/shared';
import {
  computeMilestoneMetrics,
  computeRiskMetrics,
  computeScheduleHealth,
  computeTaskMetrics,
  keyStakeholders,
  riskBand,
} from './project-metrics';

const TODAY = '2026-07-20';

function makeTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 't1',
    projectId: 'p1',
    title: 'Tarefa',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    storyPoints: null,
    requiresSOP: true,
    order: 0,
    parentId: null,
    assignee: null,
    wbsNode: null,
    startDate: null,
    dueDate: null,
    baselineStart: null,
    baselineEnd: null,
    actualStart: null,
    actualEnd: null,
    predecessors: [],
    successors: [],
    checklist: [],
    pops: [],
    deletedAt: null,
    ...overrides,
  };
}

function makeRisk(overrides: Partial<RiskDto> = {}): RiskDto {
  return {
    id: 'r1',
    projectId: 'p1',
    title: 'Risco',
    description: null,
    coOwners: [],
    probability: 'MEDIUM',
    impact: 'MEDIUM',
    score: 9,
    response: null,
    owner: null,
    ...overrides,
  };
}

function makeMilestone(overrides: Partial<MilestoneDto> = {}): MilestoneDto {
  return {
    id: 'm1',
    projectId: 'p1',
    title: 'Marco',
    description: null,
    date: '2026-08-01',
    reached: false,
    order: 0,
    ...overrides,
  };
}

function makeStakeholder(overrides: Partial<StakeholderDto> = {}): StakeholderDto {
  return {
    id: 's1',
    projectId: 'p1',
    contactId: 'c1',
    type: 'STAKEHOLDER',
    roleNote: null,
    influence: null,
    interest: null,
    quadrant: null,
    contact: { id: 'c1', name: 'Fulano', email: null, phone: null },
    ...overrides,
  };
}

describe('computeTaskMetrics', () => {
  it('should report zero progress when there are no tasks', () => {
    const metrics = computeTaskMetrics([], TODAY);

    expect(metrics.total).toBe(0);
    expect(metrics.progress).toBe(0);
  });

  it('should round the progress percentage from the done ratio', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'DONE' }),
      makeTask({ id: 'b', status: 'DONE' }),
      makeTask({ id: 'c', status: 'IN_PROGRESS' }),
    ];

    const metrics = computeTaskMetrics(tasks, TODAY);

    expect(metrics.done).toBe(2);
    expect(metrics.inProgress).toBe(1);
    expect(metrics.progress).toBe(67);
  });

  it('should ignore soft-deleted tasks in every count', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'DONE' }),
      makeTask({ id: 'b', status: 'TODO', deletedAt: '2026-07-01T00:00:00.000Z' }),
    ];

    const metrics = computeTaskMetrics(tasks, TODAY);

    expect(metrics.total).toBe(1);
    expect(metrics.progress).toBe(100);
  });

  it('should list only unfinished tasks past their due date, oldest first', () => {
    const tasks = [
      makeTask({ id: 'late-2', dueDate: '2026-07-15T00:00:00.000Z' }),
      makeTask({ id: 'late-1', dueDate: '2026-07-10T00:00:00.000Z' }),
      makeTask({ id: 'done-late', status: 'DONE', dueDate: '2026-07-01T00:00:00.000Z' }),
      makeTask({ id: 'future', dueDate: '2026-08-01T00:00:00.000Z' }),
    ];

    const metrics = computeTaskMetrics(tasks, TODAY);

    expect(metrics.overdue.map((t) => t.id)).toEqual(['late-1', 'late-2']);
  });

  it('should not treat a task due today as overdue', () => {
    const tasks = [makeTask({ dueDate: `${TODAY}T00:00:00.000Z` })];

    const metrics = computeTaskMetrics(tasks, TODAY);

    expect(metrics.overdue).toHaveLength(0);
  });

  it('should count only open tasks as unassigned', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'TODO' }),
      makeTask({ id: 'b', status: 'DONE' }),
      makeTask({ id: 'c', status: 'TODO', assignee: { id: 'u1', name: 'Ana' } }),
    ];

    const metrics = computeTaskMetrics(tasks, TODAY);

    expect(metrics.unassigned).toBe(1);
  });

  it('should group the load per assignee from the most loaded down', () => {
    const tasks = [
      makeTask({ id: 'a', assignee: { id: 'u1', name: 'Ana' }, status: 'DONE' }),
      makeTask({ id: 'b', assignee: { id: 'u1', name: 'Ana' } }),
      makeTask({ id: 'c', assignee: { id: 'u2', name: 'Bruno' } }),
    ];

    const metrics = computeTaskMetrics(tasks, TODAY);

    expect(metrics.byAssignee).toEqual([
      { id: 'u1', name: 'Ana', total: 2, done: 1 },
      { id: 'u2', name: 'Bruno', total: 1, done: 0 },
    ]);
  });
});

describe('computeScheduleHealth', () => {
  const base = { startDate: '2026-01-01', endDate: '2026-12-01', baselineSetAt: null };

  it('should stay unknown when one of the two end dates is missing', () => {
    const health = computeScheduleHealth({ ...base, forecastEndDate: null });

    expect(health.status).toBe('UNKNOWN');
    expect(health.driftDays).toBeNull();
  });

  it('should report on track when the forecast lands before the planned end', () => {
    const health = computeScheduleHealth({ ...base, forecastEndDate: '2026-11-20' });

    expect(health.driftDays).toBe(-11);
    expect(health.status).toBe('ON_TRACK');
  });

  it('should flag attention when the forecast slips by up to a week', () => {
    const health = computeScheduleHealth({ ...base, forecastEndDate: '2026-12-08' });

    expect(health.driftDays).toBe(7);
    expect(health.status).toBe('AT_RISK');
  });

  it('should flag late when the forecast slips more than a week', () => {
    const health = computeScheduleHealth({ ...base, forecastEndDate: '2026-12-09' });

    expect(health.status).toBe('LATE');
  });

  // Regressão do B2: a data vem como ISO com Z e não pode deslocar o dia.
  it('should measure the drift from the calendar day even on ISO timestamps', () => {
    const health = computeScheduleHealth({
      ...base,
      endDate: '2026-12-01T00:00:00.000Z',
      forecastEndDate: '2026-12-11T00:00:00.000Z',
    });

    expect(health.driftDays).toBe(10);
  });

  it('should expose whether the baseline was frozen', () => {
    const health = computeScheduleHealth({
      ...base,
      forecastEndDate: null,
      baselineSetAt: '2026-06-01T12:00:00.000Z',
    });

    expect(health.hasBaseline).toBe(true);
  });
});

describe('riskBand', () => {
  it('should split the score into the same bands the risks tab uses', () => {
    expect(riskBand(16)).toBe('critical');
    expect(riskBand(15)).toBe('high');
    expect(riskBand(9)).toBe('high');
    expect(riskBand(8)).toBe('medium');
    expect(riskBand(3)).toBe('low');
  });
});

describe('computeRiskMetrics', () => {
  it('should rank the top risks by score and cap them at the limit', () => {
    const risks = [
      makeRisk({ id: 'low', score: 2 }),
      makeRisk({ id: 'worst', score: 25 }),
      makeRisk({ id: 'mid', score: 12 }),
    ];

    const metrics = computeRiskMetrics(risks, 2);

    expect(metrics.top.map((r) => r.id)).toEqual(['worst', 'mid']);
  });

  it('should count critical and high risks separately', () => {
    const risks = [
      makeRisk({ id: 'a', score: 20 }),
      makeRisk({ id: 'b', score: 16 }),
      makeRisk({ id: 'c', score: 10 }),
      makeRisk({ id: 'd', score: 2 }),
    ];

    const metrics = computeRiskMetrics(risks);

    expect(metrics.critical).toBe(2);
    expect(metrics.high).toBe(1);
    expect(metrics.total).toBe(4);
  });

  it('should not mutate the array it received', () => {
    const risks = [makeRisk({ id: 'a', score: 1 }), makeRisk({ id: 'b', score: 9 })];

    computeRiskMetrics(risks);

    expect(risks.map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('computeMilestoneMetrics', () => {
  it('should separate pending milestones into overdue and upcoming', () => {
    const milestones = [
      makeMilestone({ id: 'past', date: '2026-07-01' }),
      makeMilestone({ id: 'soon', date: '2026-07-25' }),
      makeMilestone({ id: 'done', date: '2026-07-05', reached: true }),
    ];

    const metrics = computeMilestoneMetrics(milestones, TODAY);

    expect(metrics.overdue.map((m) => m.id)).toEqual(['past']);
    expect(metrics.next.map((m) => m.id)).toEqual(['soon']);
    expect(metrics.reached).toBe(1);
  });

  it('should treat a milestone dated today as upcoming', () => {
    const metrics = computeMilestoneMetrics([makeMilestone({ date: TODAY })], TODAY);

    expect(metrics.next).toHaveLength(1);
    expect(metrics.overdue).toHaveLength(0);
  });

  it('should order upcoming milestones by date and cap them at the limit', () => {
    const milestones = [
      makeMilestone({ id: 'c', date: '2026-09-01' }),
      makeMilestone({ id: 'a', date: '2026-07-21' }),
      makeMilestone({ id: 'b', date: '2026-08-01' }),
    ];

    const metrics = computeMilestoneMetrics(milestones, TODAY, 2);

    expect(metrics.next.map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('keyStakeholders', () => {
  it('should keep only the sponsor and the owner, sponsor first', () => {
    const people = [
      makeStakeholder({ id: 'team', type: 'TEAM_MEMBER' }),
      makeStakeholder({ id: 'owner', type: 'OWNER' }),
      makeStakeholder({ id: 'sponsor', type: 'SPONSOR' }),
    ];

    expect(keyStakeholders(people).map((s) => s.id)).toEqual(['sponsor', 'owner']);
  });
});
