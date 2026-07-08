import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ActivityStatus } from '@prisma/client';
import { UpdateCrmActivityUseCase } from './update-crm-activity.use-case';
import { ICrmActivityRepository } from '../domain/crm-activity.repository';

function makeRepo(overrides: Partial<ICrmActivityRepository> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'a1', status: ActivityStatus.PENDING }),
    update: vi.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
    ...overrides,
  } as unknown as ICrmActivityRepository;
}

describe('UpdateCrmActivityUseCase', () => {
  let repo: ICrmActivityRepository;
  let useCase: UpdateCrmActivityUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new UpdateCrmActivityUseCase(repo);
  });

  it('throws NotFoundException when the activity does not exist', async () => {
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new UpdateCrmActivityUseCase(repo);
    await expect(useCase.execute('missing', { status: ActivityStatus.DONE })).rejects.toThrow(NotFoundException);
  });

  it('stamps completedAt when transitioning into DONE', async () => {
    await useCase.execute('a1', { status: ActivityStatus.DONE });
    const arg = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(arg.completedAt).toBeInstanceOf(Date);
  });

  it('clears completedAt when reopening a DONE activity', async () => {
    repo = makeRepo({ findById: vi.fn().mockResolvedValue({ id: 'a1', status: ActivityStatus.DONE }) });
    useCase = new UpdateCrmActivityUseCase(repo);
    await useCase.execute('a1', { status: ActivityStatus.PENDING });
    const arg = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(arg.completedAt).toBeNull();
  });

  it('does not touch completedAt when status is unchanged or omitted', async () => {
    await useCase.execute('a1', { title: 'novo título' });
    const arg = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(arg.completedAt).toBeUndefined();
  });

  it('does not stamp completedAt when moving into CANCELLED', async () => {
    await useCase.execute('a1', { status: ActivityStatus.CANCELLED });
    const arg = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(arg.completedAt).toBeNull();
  });
});
