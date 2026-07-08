import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AddContactLinkUseCase } from './add-contact-link.use-case';
import { IContactRepository } from '../domain/contact.repository';

function makeRepo(overrides: Partial<IContactRepository> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'c1', orgLinks: [] }),
    clearPrimaryForOrg: vi.fn().mockResolvedValue(undefined),
    addLink: vi.fn().mockImplementation((_c, data) => Promise.resolve({ id: 'l1', ...data })),
    ...overrides,
  } as unknown as IContactRepository;
}

describe('AddContactLinkUseCase', () => {
  let repo: IContactRepository;
  let useCase: AddContactLinkUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new AddContactLinkUseCase(repo);
  });

  it('should demote existing primary before adding a new primary link (one primary per org)', async () => {
    await useCase.execute('c1', { orgId: 'org-1', isPrimary: true });
    expect(repo.clearPrimaryForOrg).toHaveBeenCalledWith('org-1');
    expect(repo.addLink).toHaveBeenCalled();
  });

  it('should not touch primary flags when the new link is not primary', async () => {
    await useCase.execute('c1', { orgId: 'org-1', isPrimary: false });
    expect(repo.clearPrimaryForOrg).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when the contact does not exist', async () => {
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    useCase = new AddContactLinkUseCase(repo);
    await expect(useCase.execute('missing', { orgId: 'org-1' })).rejects.toThrow(NotFoundException);
  });

  it('should throw ConflictException when the contact is already linked to the org', async () => {
    repo = makeRepo({ addLink: vi.fn().mockRejectedValue({ code: 'P2002' }) });
    useCase = new AddContactLinkUseCase(repo);
    await expect(useCase.execute('c1', { orgId: 'org-1' })).rejects.toThrow(ConflictException);
  });
});
