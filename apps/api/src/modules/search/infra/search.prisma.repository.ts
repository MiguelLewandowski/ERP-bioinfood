import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SearchRepository, SearchResultItem } from '../domain/search.types';

@Injectable()
export class SearchPrismaRepository implements SearchRepository {
  constructor(private prisma: PrismaService) {}

  async searchProjects(
    q: string,
    limit: number,
    onlyAccessibleToUserId?: string,
  ): Promise<SearchResultItem[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        deletedAt: null,
        name: { contains: q, mode: 'insensitive' },
        ...(onlyAccessibleToUserId
          ? { accesses: { some: { userId: onlyAccessibleToUserId } } }
          : {}),
      },
      select: { id: true, name: true, status: true },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
    return projects.map((p) => ({
      type: 'project' as const,
      id: p.id,
      title: p.name,
      subtitle: p.status,
      refId: null,
    }));
  }

  async searchOrganizations(q: string, limit: number): Promise<SearchResultItem[]> {
    const orgs = await this.prisma.organization.findMany({
      where: {
        deletedAt: null,
        OR: [
          { legalName: { contains: q, mode: 'insensitive' } },
          { tradeName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, legalName: true, tradeName: true },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
    return orgs.map((o) => ({
      type: 'organization' as const,
      id: o.id,
      title: o.tradeName ?? o.legalName,
      subtitle: o.tradeName ? o.legalName : null,
      refId: null,
    }));
  }

  async searchOpportunities(q: string, limit: number): Promise<SearchResultItem[]> {
    const opps = await this.prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        title: { contains: q, mode: 'insensitive' },
      },
      select: {
        id: true,
        title: true,
        orgId: true,
        organization: { select: { legalName: true, tradeName: true } },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
    return opps.map((o) => ({
      type: 'opportunity' as const,
      id: o.id,
      title: o.title,
      subtitle: o.organization.tradeName ?? o.organization.legalName,
      refId: o.orgId,
    }));
  }

  async searchContacts(q: string, limit: number): Promise<SearchResultItem[]> {
    const contacts = await this.prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        orgLinks: {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' },
          take: 1,
          select: { orgId: true, organization: { select: { legalName: true, tradeName: true } } },
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
    return contacts.map((c) => {
      const link = c.orgLinks[0];
      return {
        type: 'contact' as const,
        id: c.id,
        title: c.name,
        subtitle: link
          ? (link.organization.tradeName ?? link.organization.legalName)
          : (c.email ?? null),
        refId: link?.orgId ?? null,
      };
    });
  }
}
