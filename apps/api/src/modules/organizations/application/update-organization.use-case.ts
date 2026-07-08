import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../domain/organization.repository';
import { normalizeDocument, UpdateOrganizationData } from '../domain/organization.entity';

@Injectable()
export class UpdateOrganizationUseCase {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private repo: IOrganizationRepository) {}

  async execute(id: string, data: UpdateOrganizationData) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Cliente não encontrado');

    const patch = { ...data };
    // Normalize document if it's being changed, and guard against collisions.
    if (data.document !== undefined) {
      const document = normalizeDocument(data.document);
      patch.document = document;
      const type = data.documentType ?? existing.documentType;
      if (document && type !== DocumentType.FOREIGN) {
        const other = await this.repo.findByDocument(document);
        if (other && other.id !== id) {
          throw new ConflictException({
            message: 'Já existe uma organização com este documento',
            existingId: other.id,
          });
        }
      }
    }

    return this.repo.update(id, patch);
  }
}
