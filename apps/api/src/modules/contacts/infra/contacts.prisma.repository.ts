import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IContactRepository } from '../domain/contact.repository';
import {
  ContactDetail,
  ContactListFilter,
  ContactListItem,
  ContactOrgLink,
  CreateContactData,
  CreateLinkData,
  UpdateContactData,
  UpdateLinkData,
} from '../domain/contact.entity';

const LIST_SELECT = { id: true, name: true, email: true, phone: true, mobile: true } as const;

const LINK_SELECT = {
  id: true,
  orgId: true,
  organization: { select: { id: true, legalName: true, tradeName: true } },
  jobTitle: true,
  department: true,
  isDecision: true,
  isFinance: true,
  isTechnical: true,
  isPrimary: true,
  isActive: true,
} as const;

@Injectable()
export class ContactsPrismaRepository implements IContactRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: ContactListFilter): Promise<ContactListItem[]> {
    const contacts = await this.prisma.contact.findMany({
      where: {
        deletedAt: null,
        orgLinks: filter.orgId ? { some: { orgId: filter.orgId } } : undefined,
        OR: filter.search
          ? [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { email: { contains: filter.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: {
        ...LIST_SELECT,
        // Only pull the link for the filtered org, to surface its markers.
        orgLinks: filter.orgId
          ? {
              where: { orgId: filter.orgId },
              select: {
                id: true, jobTitle: true, isDecision: true, isFinance: true,
                isTechnical: true, isPrimary: true,
              },
            }
          : false,
      },
      orderBy: { name: 'asc' },
      take: 200,
    });

    return contacts.map((c) => {
      const { orgLinks, ...base } = c as typeof c & { orgLinks?: Array<Record<string, unknown>> };
      const l = orgLinks?.[0];
      return {
        ...base,
        link: l
          ? {
              linkId: l.id as string,
              jobTitle: l.jobTitle as string | null,
              isDecision: l.isDecision as boolean,
              isFinance: l.isFinance as boolean,
              isTechnical: l.isTechnical as boolean,
              isPrimary: l.isPrimary as boolean,
            }
          : null,
      };
    });
  }

  findById(id: string): Promise<ContactDetail | null> {
    return this.prisma.contact.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...LIST_SELECT,
        cpf: true,
        whatsapp: true,
        fax: true,
        ramal: true,
        birthDate: true,
        facebook: true,
        twitter: true,
        linkedin: true,
        skype: true,
        instagram: true,
        notes: true,
        orgLinks: { select: LINK_SELECT, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  create(data: CreateContactData): Promise<ContactListItem> {
    return this.prisma.contact.create({ data, select: LIST_SELECT });
  }

  update(id: string, data: UpdateContactData): Promise<ContactListItem> {
    return this.prisma.contact.update({ where: { id }, data, select: LIST_SELECT });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.contact.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  findLink(contactId: string, linkId: string): Promise<ContactOrgLink | null> {
    return this.prisma.contactOrganizationLink.findFirst({
      where: { id: linkId, contactId },
      select: LINK_SELECT,
    });
  }

  addLink(contactId: string, data: CreateLinkData): Promise<ContactOrgLink> {
    return this.prisma.contactOrganizationLink.create({
      data: { contactId, ...data },
      select: LINK_SELECT,
    });
  }

  updateLink(linkId: string, data: UpdateLinkData): Promise<ContactOrgLink> {
    return this.prisma.contactOrganizationLink.update({
      where: { id: linkId },
      data,
      select: LINK_SELECT,
    });
  }

  async removeLink(linkId: string): Promise<void> {
    await this.prisma.contactOrganizationLink.delete({ where: { id: linkId } });
  }

  async clearPrimaryForOrg(orgId: string, exceptLinkId?: string): Promise<void> {
    await this.prisma.contactOrganizationLink.updateMany({
      where: { orgId, isPrimary: true, id: exceptLinkId ? { not: exceptLinkId } : undefined },
      data: { isPrimary: false },
    });
  }
}
