import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, UseGuards,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListContactsUseCase } from '../application/list-contacts.use-case';
import { GetContactUseCase } from '../application/get-contact.use-case';
import { CreateContactUseCase } from '../application/create-contact.use-case';
import { UpdateContactUseCase } from '../application/update-contact.use-case';
import { DeleteContactUseCase } from '../application/delete-contact.use-case';
import { AddContactLinkUseCase } from '../application/add-contact-link.use-case';
import { UpdateContactLinkUseCase } from '../application/update-contact-link.use-case';
import { RemoveContactLinkUseCase } from '../application/remove-contact-link.use-case';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { toContactDetailDto, toContactLinkDto, toContactListItemDto } from './contact.mapper';

// Contatos = dados mestres internos. Ler = papéis internos; escrever = só ADMIN
// (decisão do owner). CLIENTE nunca acessa (não está na lista de @Roles).
const WRITE_ROLES = [SystemRole.ADMIN] as const;

@Controller('contacts')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN, SystemRole.APROVA, SystemRole.INSERE, SystemRole.CONSULTA)
export class ContactsController {
  constructor(
    private listContacts: ListContactsUseCase,
    private getContact: GetContactUseCase,
    private createContact: CreateContactUseCase,
    private updateContact: UpdateContactUseCase,
    private deleteContact: DeleteContactUseCase,
    private addLink: AddContactLinkUseCase,
    private updateLink: UpdateContactLinkUseCase,
    private removeLink: RemoveContactLinkUseCase,
  ) {}

  @Get()
  async list(@Query('orgId') orgId?: string, @Query('search') search?: string) {
    const contacts = await this.listContacts.execute({ orgId, search });
    return contacts.map(toContactListItemDto);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return toContactDetailDto(await this.getContact.execute(id));
  }

  @Post()
  @Roles(...WRITE_ROLES)
  async create(@Body() dto: CreateContactDto) {
    const contact = await this.createContact.execute({
      ...dto,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    });
    return toContactListItemDto(contact);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    const contact = await this.updateContact.execute(id, {
      ...dto,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    });
    return toContactListItemDto(contact);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.deleteContact.execute(id);
  }

  @Post(':id/links')
  @Roles(...WRITE_ROLES)
  async addContactLink(@Param('id') id: string, @Body() dto: CreateLinkDto) {
    return toContactLinkDto(await this.addLink.execute(id, dto));
  }

  @Patch(':id/links/:linkId')
  @Roles(...WRITE_ROLES)
  async updateContactLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateLinkDto,
  ) {
    return toContactLinkDto(await this.updateLink.execute(id, linkId, dto));
  }

  @Delete(':id/links/:linkId')
  @Roles(...WRITE_ROLES)
  @HttpCode(204)
  async removeContactLink(@Param('id') id: string, @Param('linkId') linkId: string) {
    await this.removeLink.execute(id, linkId);
  }
}
