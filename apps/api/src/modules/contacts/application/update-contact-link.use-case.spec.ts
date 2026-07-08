import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UpdateContactLinkUseCase } from './update-contact-link.use-case';
import { IContactRepository } from '../domain/contact.repository';

function makeRepo(overrides: Partial<IContactRepository> = {}) {
  return {
    findLink: vi.fn().mockResolvedValue({ id: 'l1', orgId: 'org-1' }),
    clearPrimaryForOrg: vi.fn().mockResolvedValue(undefined),
    updateLink: vi.fn().mockResolvedValue({ id: 'l1' }),
    ...overrides,
  } as unknown as IContactRepository;
}

describe('UpdateContactLinkUseCase', () => {
  let repo: IContactRepository;
  let useCase: UpdateContactLinkUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new UpdateContactLinkUseCase(repo);
  });

  it('should reject a link that does not belong to the contact (anti-IDOR)', async () => {
    repo = makeRepo({ findLink: vi.fn().mockResolvedValue(null) });
    useCase = new UpdateContactLinkUseCase(repo);

    await expect(useCase.execute('c1', 'other-link', { jobTitle: 'x' })).rejects.toThrow(NotFoundException);
    expect(repo.updateLink).not.toHaveBeenCalled();
  });

  it('should scope the link lookup by contactId', async () => {
    await useCase.execute('c1', 'l1', { jobTitle: 'CTO' });
    expect(repo.findLink).toHaveBeenCalledWith('c1', 'l1');
  });

  it('should demote other primaries (except itself) when promoting a link to primary', async () => {
    await useCase.execute('c1', 'l1', { isPrimary: true });
    expect(repo.clearPrimaryForOrg).toHaveBeenCalledWith('org-1', 'l1');
  });
});
