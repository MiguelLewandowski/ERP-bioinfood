import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IContactRepository, CONTACT_REPOSITORY } from '../domain/contact.repository';
import { UpdateLinkData } from '../domain/contact.entity';

@Injectable()
export class UpdateContactLinkUseCase {
  constructor(@Inject(CONTACT_REPOSITORY) private repo: IContactRepository) {}

  async execute(contactId: string, linkId: string, data: UpdateLinkData) {
    // Scope by contactId so a link from another contact can't be edited (IDOR).
    const link = await this.repo.findLink(contactId, linkId);
    if (!link) throw new NotFoundException('Vínculo não encontrado');

    if (data.isPrimary) await this.repo.clearPrimaryForOrg(link.orgId, linkId);

    return this.repo.updateLink(linkId, data);
  }
}
