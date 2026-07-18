import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ManageProductServicesUseCase } from './manage-product-services.use-case';
import { IOrganizationRepository } from '../domain/organization.repository';

function makeRepo(overrides: Partial<IOrganizationRepository> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'org-1' }),
    addProductService: vi.fn().mockResolvedValue({ id: 'ps-1', name: 'Análise laboratorial' }),
    removeProductService: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IOrganizationRepository;
}

describe('ManageProductServicesUseCase', () => {
  let repo: IOrganizationRepository;
  let useCase: ManageProductServicesUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new ManageProductServicesUseCase(repo);
  });

  it('should reject adding a product/service to an organization that does not exist', async () => {
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new ManageProductServicesUseCase(repo);

    await expect(useCase.add('missing-org', 'ps-1')).rejects.toThrow(NotFoundException);
    expect(repo.addProductService).not.toHaveBeenCalled();
  });

  it('should scope the link by orgId when adding', async () => {
    await useCase.add('org-1', 'ps-1');
    expect(repo.addProductService).toHaveBeenCalledWith('org-1', 'ps-1');
  });

  it('should reject removing a product/service from an organization that does not exist', async () => {
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new ManageProductServicesUseCase(repo);

    await expect(useCase.remove('missing-org', 'ps-1')).rejects.toThrow(NotFoundException);
    expect(repo.removeProductService).not.toHaveBeenCalled();
  });

  it('should scope the link removal by orgId', async () => {
    await useCase.remove('org-1', 'ps-1');
    expect(repo.removeProductService).toHaveBeenCalledWith('org-1', 'ps-1');
  });
});
