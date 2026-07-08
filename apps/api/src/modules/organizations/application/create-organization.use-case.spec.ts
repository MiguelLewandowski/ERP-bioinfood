import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { CreateOrganizationUseCase } from './create-organization.use-case';
import { IOrganizationRepository } from '../domain/organization.repository';

function makeRepo(overrides: Partial<IOrganizationRepository> = {}) {
  return {
    findByDocument: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'new', ...data })),
    ...overrides,
  } as unknown as IOrganizationRepository;
}

describe('CreateOrganizationUseCase', () => {
  let repo: IOrganizationRepository;
  let useCase: CreateOrganizationUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new CreateOrganizationUseCase(repo);
  });

  it('should normalize a masked document to digits before persisting', async () => {
    await useCase.execute({ legalName: 'Acme', document: '11.222.333/0001-44', documentType: DocumentType.CNPJ });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ document: '11222333000144' }));
  });

  it('should throw ConflictException with existing id when document already exists', async () => {
    repo = makeRepo({
      findByDocument: vi.fn().mockResolvedValue({ id: 'existing-1', legalName: 'Old', tradeName: null, document: '11222333000144', status: 'ACTIVE' }),
    });
    useCase = new CreateOrganizationUseCase(repo);

    await expect(
      useCase.execute({ legalName: 'Dup', document: '11222333000144', documentType: DocumentType.CNPJ }),
    ).rejects.toThrow(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('should skip document dedup for FOREIGN parties', async () => {
    const findByDocument = vi.fn().mockResolvedValue({ id: 'x' });
    repo = makeRepo({ findByDocument });
    useCase = new CreateOrganizationUseCase(repo);

    await useCase.execute({ legalName: 'Foreign Corp', document: 'ABC-123', documentType: DocumentType.FOREIGN });

    expect(findByDocument).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalled();
  });

  it('should store null document when none is provided', async () => {
    await useCase.execute({ legalName: 'No Doc' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ document: null }));
  });
});
