import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IContactRepository, CONTACT_REPOSITORY } from '../domain/contact.repository';

@Injectable()
export class RemoveContactLinkUseCase {
  constructor(@Inject(CONTACT_REPOSITORY) private repo: IContactRepository) {}

  async execute(contactId: string, linkId: string) {
    const link = await this.repo.findLink(contactId, linkId);
    if (!link) throw new NotFoundException('Vínculo não encontrado');
    await this.repo.removeLink(linkId);
  }
}
