import { Injectable, Inject } from '@nestjs/common';
import { IContactRepository, CONTACT_REPOSITORY } from '../domain/contact.repository';
import { ContactListFilter } from '../domain/contact.entity';

@Injectable()
export class ListContactsUseCase {
  constructor(@Inject(CONTACT_REPOSITORY) private repo: IContactRepository) {}

  execute(filter: ContactListFilter) {
    return this.repo.findAll(filter);
  }
}
