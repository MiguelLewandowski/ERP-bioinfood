import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetPopUseCase } from './get-pop.use-case';
import { IPopRepository } from '../domain/pops.repository.interface';

function makeRepo(overrides: Partial<IPopRepository> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'pop1', projectId: 'proj1' }),
    ...overrides,
  } as unknown as IPopRepository;
}

describe('GetPopUseCase', () => {
  let repo: IPopRepository;
  let useCase: GetPopUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new GetPopUseCase(repo);
  });

  it('should throw NotFoundException when the POP does not exist', async () => {
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new GetPopUseCase(repo);

    await expect(useCase.execute('proj1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('should reject a POP that belongs to a different project (anti-IDOR)', async () => {
    await expect(useCase.execute('OTHER_PROJECT', 'pop1')).rejects.toThrow(ForbiddenException);
  });

  it('should return the POP when it belongs to the project in the URL', async () => {
    const pop = await useCase.execute('proj1', 'pop1');
    expect(pop).toEqual({ id: 'pop1', projectId: 'proj1' });
  });
});
