import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
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
    findVersionRef: vi.fn().mockResolvedValue({ id: 'v1' }),
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

  it('should throw NotFoundException when the task belongs to a different project (anti-IDOR)', async () => {
    taskRepo = makeTaskRepo({ findById: vi.fn().mockResolvedValue({ id: 'task1', projectId: 'OTHER' }) });
    useCase = new AddPopUsageUseCase(taskRepo, popRepo);

    await expect(useCase.execute('proj1', 'task1', 'v1', 'u1')).rejects.toThrow(NotFoundException);
    expect(taskRepo.addPopUsage).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when the pop version does not exist or belongs to a deleted POP', async () => {
    popRepo = makePopRepo({ findVersionRef: vi.fn().mockResolvedValue(null) });
    useCase = new AddPopUsageUseCase(taskRepo, popRepo);

    await expect(useCase.execute('proj1', 'task1', 'missing-version', 'u1')).rejects.toThrow(NotFoundException);
    expect(taskRepo.addPopUsage).not.toHaveBeenCalled();
  });

  it('should link a global POP version to a task regardless of which project the POP was created for', async () => {
    // POP não tem projeto — a mesma versão pode ser usada por tasks de
    // qualquer projeto. Só a task precisa pertencer ao projeto da URL.
    await useCase.execute('proj1', 'task1', 'v1', 'u1');
    expect(taskRepo.addPopUsage).toHaveBeenCalledWith('task1', 'v1', 'u1');
  });
});
