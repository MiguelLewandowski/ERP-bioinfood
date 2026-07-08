import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { IContactRepository, CONTACT_REPOSITORY } from '../domain/contact.repository';
import { CreateLinkData } from '../domain/contact.entity';

@Injectable()
export class AddContactLinkUseCase {
  constructor(@Inject(CONTACT_REPOSITORY) private repo: IContactRepository) {}

  async execute(contactId: string, data: CreateLinkData) {
    const contact = await this.repo.findById(contactId);
    if (!contact) throw new NotFoundException('Contato não encontrado');

    // One primary contact per organization: demote any existing primary first.
    if (data.isPrimary) await this.repo.clearPrimaryForOrg(data.orgId);

    try {
      return await this.repo.addLink(contactId, data);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Contato já vinculado a esta organização');
      throw err;
    }
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}
