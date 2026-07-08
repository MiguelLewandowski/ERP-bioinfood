import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IContactRepository, CONTACT_REPOSITORY } from '../domain/contact.repository';

@Injectable()
export class DeleteContactUseCase {
  constructor(@Inject(CONTACT_REPOSITORY) private repo: IContactRepository) {}

  async execute(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Contato não encontrado');
    await this.repo.softDelete(id);
  }
}
