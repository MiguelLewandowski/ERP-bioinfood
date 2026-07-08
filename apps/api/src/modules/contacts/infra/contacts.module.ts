import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CONTACT_REPOSITORY } from '../domain/contact.repository';
import { ContactsPrismaRepository } from './contacts.prisma.repository';
import { ContactsController } from './contacts.controller';
import { ListContactsUseCase } from '../application/list-contacts.use-case';
import { GetContactUseCase } from '../application/get-contact.use-case';
import { CreateContactUseCase } from '../application/create-contact.use-case';
import { UpdateContactUseCase } from '../application/update-contact.use-case';
import { DeleteContactUseCase } from '../application/delete-contact.use-case';
import { AddContactLinkUseCase } from '../application/add-contact-link.use-case';
import { UpdateContactLinkUseCase } from '../application/update-contact-link.use-case';
import { RemoveContactLinkUseCase } from '../application/remove-contact-link.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [ContactsController],
  providers: [
    { provide: CONTACT_REPOSITORY, useClass: ContactsPrismaRepository },
    ListContactsUseCase,
    GetContactUseCase,
    CreateContactUseCase,
    UpdateContactUseCase,
    DeleteContactUseCase,
    AddContactLinkUseCase,
    UpdateContactLinkUseCase,
    RemoveContactLinkUseCase,
  ],
})
export class ContactsModule {}
