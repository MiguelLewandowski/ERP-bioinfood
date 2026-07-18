import { PartyRoleType } from '@prisma/client';
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
} from './organization.entity';

export const ORGANIZATION_REPOSITORY = 'ORGANIZATION_REPOSITORY';

export interface IOrganizationRepository {
  findAll(): Promise<OrganizationListItem[]>;
  findById(id: string): Promise<OrganizationDetail | null>;
  findByDocument(document: string): Promise<OrganizationListItem | null>;
  create(data: CreateOrganizationData): Promise<OrganizationListItem>;
  update(id: string, data: UpdateOrganizationData): Promise<OrganizationDetail>;

  addRole(orgId: string, type: PartyRoleType): Promise<OrgRole>;
  removeRole(orgId: string, type: PartyRoleType): Promise<void>;

  addAddress(orgId: string, data: AddressData): Promise<OrgAddress>;
  findAddress(orgId: string, addressId: string): Promise<OrgAddress | null>;
  updateAddress(addressId: string, data: AddressData): Promise<OrgAddress>;
  removeAddress(addressId: string): Promise<void>;

  upsertCustomerProfile(orgId: string, data: CustomerProfileData): Promise<OrgCustomerProfile>;

  addProductService(orgId: string, productServiceId: string): Promise<{ id: string; name: string }>;
  removeProductService(orgId: string, productServiceId: string): Promise<void>;

  findStale(days: number): Promise<StaleOrganization[]>;
}
