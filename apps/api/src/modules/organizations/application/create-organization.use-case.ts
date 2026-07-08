import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../domain/organization.repository';
import { CreateOrganizationData, normalizeDocument } from '../domain/organization.entity';

@Injectable()
export class CreateOrganizationUseCase {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private repo: IOrganizationRepository) {}

  async execute(data: CreateOrganizationData) {
    const document = normalizeDocument(data.document);

    // Deduplicate on document, except for foreign parties which may lack a CNPJ
    // (decision 7): those fall back to no document-based check.
    if (document && data.documentType !== DocumentType.FOREIGN) {
      const existing = await this.repo.findByDocument(document);
      if (existing) {
        throw new ConflictException({
          message: 'Já existe uma organização com este documento',
          existingId: existing.id,
          existingName: existing.legalName,
        });
      }
    }

    return this.repo.create({ ...data, document });
  }
}
