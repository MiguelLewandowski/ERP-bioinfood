import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AddPopUsageUseCase } from './add-pop-usage.use-case';
import { ITaskRepository } from '../../domain/tasks.repository.interface';
import { IPopRepository } from '../../../pops/domain/pops.repository.interface';

function makeTaskRepo(overrides: Partial<ITaskRepository> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'task1', projectId: 'proj1' }),
    addPopUsage: vi.fn().mockResolvedValue({ id: 'link1', taskId: 'task1', popVersionId: 'v1' }),
    ...overrides,
  } as unknown as ITaskRepository;
}

function makePopRepo(overrides: Partial<IPopRepository> = {}) {
  return {
    findVersionProjectRef: vi.fn().mockResolvedValue({ id: 'v1', projectId: 'proj1' }),
    ...overrides,
  } as unknown as IPopRepository;
}

describe('AddPopUsageUseCase', () => {
  let taskRepo: ITaskRepository;
  let popRepo: IPopRepository;
  let useCase: AddPopUsageUseCase;

  beforeEach(() => {
    taskRepo = makeTaskRepo();
    popRepo = makePopRepo();
    useCase = new AddPopUsageUseCase(taskRepo, popRepo);
  });

  it('should throw NotFoundException when the task does not exist', async () => {
    taskRepo = makeTaskRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new AddPopUsageUseCase(taskRepo, popRepo);

    await expect(useCase.execute('proj1', 'missing', 'v1', 'u1')).rejects.toThrow(NotFoundException);
    expect(taskRepo.addPopUsage).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when the task belongs to a different project', async () => {
    taskRepo = makeTaskRepo({ findById: vi.fn().mockResolvedValue({ id: 'task1', projectId: 'OTHER' }) });
    useCase = new AddPopUsageUseCase(taskRepo, popRepo);

    await expect(useCase.execute('proj1', 'task1', 'v1', 'u1')).rejects.toThrow(NotFoundException);
    expect(taskRepo.addPopUsage).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when the pop version does not exist', async () => {
    popRepo = makePopRepo({ findVersionProjectRef: vi.fn().mockResolvedValue(null) });
    useCase = new AddPopUsageUseCase(taskRepo, popRepo);

    await expect(useCase.execute('proj1', 'task1', 'missing-version', 'u1')).rejects.toThrow(NotFoundException);
    expect(taskRepo.addPopUsage).not.toHaveBeenCalled();
  });

  it('should reject a POP version from a different project (anti-IDOR)', async () => {
    popRepo = makePopRepo({
      findVersionProjectRef: vi.fn().mockResolvedValue({ id: 'v9', projectId: 'OTHER_PROJECT' }),
    });
    useCase = new AddPopUsageUseCase(taskRepo, popRepo);

    await expect(useCase.execute('proj1', 'task1', 'v9', 'u1')).rejects.toThrow(ForbiddenException);
    expect(taskRepo.addPopUsage).not.toHaveBeenCalled();
  });

  it('should link the task to the pop version when both belong to the same project', async () => {
    await useCase.execute('proj1', 'task1', 'v1', 'u1');
    expect(taskRepo.addPopUsage).toHaveBeenCalledWith('task1', 'v1', 'u1');
  });
});
