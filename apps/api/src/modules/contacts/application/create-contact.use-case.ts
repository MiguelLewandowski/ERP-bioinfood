import { Injectable, Inject } from '@nestjs/common';
import { IContactRepository, CONTACT_REPOSITORY } from '../domain/contact.repository';
import { CreateContactData } from '../domain/contact.entity';

@Injectable()
export class CreateContactUseCase {
  constructor(@Inject(CONTACT_REPOSITORY) private repo: IContactRepository) {}

  execute(data: CreateContactData) {
    return this.repo.create(data);
  }
}
