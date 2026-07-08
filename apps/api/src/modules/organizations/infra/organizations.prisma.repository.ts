import { Injectable } from '@nestjs/common';
import { PartyRoleType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IOrganizationRepository } from '../domain/organization.repository';
import {
  AddressData,
  CreateOrganizationData,
  CustomerProfileData,
  OrgAddress,
  OrganizationDetail,
  OrganizationListItem,
  OrgCustomerProfile,
  OrgRole,
  StaleOrganization,
  UpdateOrganizationData,
} from '../domain/organization.entity';

const LIST_SELECT = {
  id: true,
  legalName: true,
  tradeName: true,
  document: true,
  status: true,
  email: true,
  phone: true,
  whatsapp: true,
  sector: { select: { id: true, name: true } },
  roles: { select: { type: true } },
} as const;

const ROLE_SELECT = { id: true, type: true, status: true } as const;

const ADDRESS_SELECT = {
  id: true,
  type: true,
  isPrimary: true,
  street: true,
  number: true,
  complement: true,
  district: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
} as const;

@Injectable()
export class OrganizationsPrismaRepository implements IOrganizationRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<OrganizationListItem[]> {
    const rows = await this.prisma.organization.findMany({
      where: { deletedAt: null },
      select: LIST_SELECT,
      orderBy: { legalName: 'asc' },
      take: 200,
    });
    return rows.map(({ roles, ...r }) => ({ ...r, roleTypes: roles.map((role) => role.type) }));
  }

  async findById(id: string): Promise<OrganizationDetail | null> {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...LIST_SELECT,
        partyType: true,
        documentType: true,
        stateRegistration: true,
        cityRegistration: true,
        cnae: true,
        registrationStatus: true,
        website: true,
        notes: true,
        sectorId: true,
        sourceId: true,
        email: true,
        phone: true,
        mobile: true,
        whatsapp: true,
        fax: true,
        ramal: true,
        facebook: true,
        twitter: true,
        linkedin: true,
        skype: true,
        instagram: true,
        roles: { select: ROLE_SELECT, orderBy: { type: 'asc' } },
        addresses: { select: ADDRESS_SELECT, orderBy: { createdAt: 'asc' } },
        customerProfile: {
          select: { stage: true, paymentTerms: true, creditLimit: true, salesRepId: true },
        },
      },
    });
    if (!org) return null;
    return {
      ...org,
      roleTypes: org.roles.map((r) => r.type),
      customerProfile: org.customerProfile
        ? { ...org.customerProfile, creditLimit: org.customerProfile.creditLimit?.toString() ?? null }
        : null,
    };
  }

  async findByDocument(document: string): Promise<OrganizationListItem | null> {
    const row = await this.prisma.organization.findFirst({
      where: { document, deletedAt: null },
      select: LIST_SELECT,
    });
    if (!row) return null;
    const { roles, ...rest } = row;
    return { ...rest, roleTypes: roles.map((role) => role.type) };
  }

  async create(data: CreateOrganizationData): Promise<OrganizationListItem> {
    const { roles, ...rest } = await this.prisma.organization.create({
      data: { ...data, document: data.document ?? undefined },
      select: LIST_SELECT,
    });
    return { ...rest, roleTypes: roles.map((role) => role.type) };
  }

  async update(id: string, data: UpdateOrganizationData): Promise<OrganizationDetail> {
    await this.prisma.organization.update({ where: { id }, data });
    return (await this.findById(id))!;
  }

  addRole(orgId: string, type: PartyRoleType): Promise<OrgRole> {
    // Idempotent: a role already present is returned as-is (unique orgId+type).
    return this.prisma.partyRole.upsert({
      where: { orgId_type: { orgId, type } },
      update: {},
      create: { orgId, type },
      select: ROLE_SELECT,
    });
  }

  async removeRole(orgId: string, type: PartyRoleType): Promise<void> {
    await this.prisma.partyRole.deleteMany({ where: { orgId, type } });
  }

  addAddress(orgId: string, data: AddressData): Promise<OrgAddress> {
    return this.prisma.address.create({ data: { orgId, ...data }, select: ADDRESS_SELECT });
  }

  findAddress(orgId: string, addressId: string): Promise<OrgAddress | null> {
    return this.prisma.address.findFirst({ where: { id: addressId, orgId }, select: ADDRESS_SELECT });
  }

  updateAddress(addressId: string, data: AddressData): Promise<OrgAddress> {
    return this.prisma.address.update({ where: { id: addressId }, data, select: ADDRESS_SELECT });
  }

  async removeAddress(addressId: string): Promise<void> {
    await this.prisma.address.delete({ where: { id: addressId } });
  }

  async upsertCustomerProfile(orgId: string, data: CustomerProfileData): Promise<OrgCustomerProfile> {
    const profile = await this.prisma.customerProfile.upsert({
      where: { orgId },
      update: data,
      create: { orgId, ...data },
      select: { stage: true, paymentTerms: true, creditLimit: true, salesRepId: true },
    });
    return { ...profile, creditLimit: profile.creditLimit?.toString() ?? null };
  }

  async findStale(days: number): Promise<StaleOrganization[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; legalName: string; tradeName: string | null; lastInteractionAt: Date | null }>
    >`
      SELECT o.id, o."legalName", o."tradeName", MAX(i."interactionAt") AS "lastInteractionAt"
      FROM "Organization" o
      LEFT JOIN "Interaction" i ON i."orgId" = o.id AND i."deletedAt" IS NULL
      WHERE o."deletedAt" IS NULL AND o.status = 'ACTIVE'
      GROUP BY o.id
      HAVING MAX(i."interactionAt") IS NULL OR MAX(i."interactionAt") < ${cutoff}
      ORDER BY "lastInteractionAt" ASC NULLS FIRST
      LIMIT 200
    `;

    return rows.map((r) => ({
      ...r,
      lastInteractionAt: r.lastInteractionAt?.toISOString() ?? null,
    }));
  }
}
