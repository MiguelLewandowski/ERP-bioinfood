import { describe, it, expect, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { GetStaleOrganizationsUseCase } from './get-stale-organizations.use-case';
import { IOrganizationRepository } from '../domain/organization.repository';

describe('GetStaleOrganizationsUseCase', () => {
  it('rejects a non-positive days value', async () => {
    const repo = { findStale: vi.fn() } as unknown as IOrganizationRepository;
    const useCase = new GetStaleOrganizationsUseCase(repo);
    expect(() => useCase.execute(0)).toThrow(BadRequestException);
    expect(() => useCase.execute(-5)).toThrow(BadRequestException);
    expect(repo.findStale).not.toHaveBeenCalled();
  });

  it('delegates to the repository with the given day threshold', async () => {
    const repo = {
      findStale: vi.fn().mockResolvedValue([{ id: 'o1', legalName: 'ACME', tradeName: null, lastInteractionAt: null }]),
    } as unknown as IOrganizationRepository;
    const useCase = new GetStaleOrganizationsUseCase(repo);

    const result = await useCase.execute(45);

    expect(repo.findStale).toHaveBeenCalledWith(45);
    expect(result).toHaveLength(1);
  });
});
