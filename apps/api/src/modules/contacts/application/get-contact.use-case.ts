import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IContactRepository, CONTACT_REPOSITORY } from '../domain/contact.repository';

@Injectable()
export class GetContactUseCase {
  constructor(@Inject(CONTACT_REPOSITORY) private repo: IContactRepository) {}

  async execute(id: string) {
    const contact = await this.repo.findById(id);
    if (!contact) throw new NotFoundException('Contato não encontrado');
    return contact;
  }
}
