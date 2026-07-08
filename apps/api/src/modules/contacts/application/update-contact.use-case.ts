import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IContactRepository, CONTACT_REPOSITORY } from '../domain/contact.repository';
import { UpdateContactData } from '../domain/contact.entity';

@Injectable()
export class UpdateContactUseCase {
  constructor(@Inject(CONTACT_REPOSITORY) private repo: IContactRepository) {}

  async execute(id: string, data: UpdateContactData) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Contato não encontrado');
    return this.repo.update(id, data);
  }
}
