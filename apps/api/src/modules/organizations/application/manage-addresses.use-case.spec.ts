import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ManageAddressesUseCase } from './manage-addresses.use-case';
import { IOrganizationRepository } from '../domain/organization.repository';

function makeRepo(overrides: Partial<IOrganizationRepository> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'org-1' }),
    findAddress: vi.fn().mockResolvedValue({ id: 'a1', type: 'PRIMARY' }),
    updateAddress: vi.fn().mockResolvedValue({ id: 'a1' }),
    removeAddress: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IOrganizationRepository;
}

describe('ManageAddressesUseCase', () => {
  let repo: IOrganizationRepository;
  let useCase: ManageAddressesUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new ManageAddressesUseCase(repo);
  });

  it('should reject updating an address that does not belong to the org (anti-IDOR)', async () => {
    repo = makeRepo({ findAddress: vi.fn().mockResolvedValue(null) });
    useCase = new ManageAddressesUseCase(repo);

    await expect(useCase.update('org-1', 'foreign-addr', { city: 'x' })).rejects.toThrow(NotFoundException);
    expect(repo.updateAddress).not.toHaveBeenCalled();
  });

  it('should scope the address lookup by orgId on update', async () => {
    await useCase.update('org-1', 'a1', { city: 'Campinas' });
    expect(repo.findAddress).toHaveBeenCalledWith('org-1', 'a1');
  });

  it('should reject removing an address from another org (anti-IDOR)', async () => {
    repo = makeRepo({ findAddress: vi.fn().mockResolvedValue(null) });
    useCase = new ManageAddressesUseCase(repo);

    await expect(useCase.remove('org-1', 'foreign-addr')).rejects.toThrow(NotFoundException);
    expect(repo.removeAddress).not.toHaveBeenCalled();
  });
});
