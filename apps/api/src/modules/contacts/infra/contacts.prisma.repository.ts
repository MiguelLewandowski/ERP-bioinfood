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

const LIST_SELECT = {
  id: true, name: true, email: true, whatsapp: true,
  source: { select: { id: true, name: true } },
} as const;

// Vínculos com empresa: alimentam a coluna Empresa da tabela de Pessoas e, quando
// a listagem é filtrada por empresa, identificam o link para editar/desvincular.
const ORG_LINK_SELECT = {
  id: true,
  jobTitle: true,
  organization: { select: { id: true, legalName: true, tradeName: true } },
} as const;

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

// Nome de exibição da empresa: fantasia quando existe, senão a razão social.
function toOrganizations(
  links: Array<{ jobTitle: string | null; organization: { id: string; legalName: string; tradeName: string | null } }>,
): Array<{ id: string; name: string; jobTitle: string | null }> {
  return links.map((l) => ({
    id: l.organization.id,
    name: l.organization.tradeName || l.organization.legalName,
    jobTitle: l.jobTitle,
  }));
}

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
        // Filtrado por empresa traz só aquele vínculo; sem filtro traz todos,
        // que é o que a tabela de Pessoas usa na coluna Empresa.
        orgLinks: {
          where: filter.orgId ? { orgId: filter.orgId } : undefined,
          select: ORG_LINK_SELECT,
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
      take: 200,
    });

    return contacts.map(({ orgLinks, ...base }) => {
      const first = orgLinks[0];
      return {
        ...base,
        organizations: toOrganizations(orgLinks),
        link: filter.orgId && first
          ? { linkId: first.id, jobTitle: first.jobTitle }
          : null,
      };
    });
  }

  async findById(id: string): Promise<ContactDetail | null> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...LIST_SELECT,
        linkedin: true,
        notes: true,
        orgLinks: { select: LINK_SELECT, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!contact) return null;
    return { ...contact, organizations: toOrganizations(contact.orgLinks), link: null };
  }

  async create(data: CreateContactData): Promise<ContactListItem> {
    const contact = await this.prisma.contact.create({
      data,
      select: { ...LIST_SELECT, orgLinks: { select: ORG_LINK_SELECT } },
    });
    return { ...contact, organizations: toOrganizations(contact.orgLinks), link: null };
  }

  async update(id: string, data: UpdateContactData): Promise<ContactListItem> {
    const contact = await this.prisma.contact.update({
      where: { id },
      data,
      select: { ...LIST_SELECT, orgLinks: { select: ORG_LINK_SELECT } },
    });
    return { ...contact, organizations: toOrganizations(contact.orgLinks), link: null };
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
