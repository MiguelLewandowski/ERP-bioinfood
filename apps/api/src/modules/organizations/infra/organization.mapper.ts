import {
  OrgAddress, OrganizationDetail, OrganizationListItem, OrgCustomerProfile, OrgRole,
} from '../domain/organization.entity';

export interface OrganizationResponseDto {
  id: string;
  legalName: string;
  tradeName: string | null;
  document: string | null;
  status: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  sector: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  roleTypes: string[];
}

export interface OrgRoleDto {
  id: string;
  type: string;
  status: string;
}

export interface OrgAddressDto {
  id: string;
  type: string;
  isPrimary: boolean;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string;
}

export interface OrgCustomerProfileDto {
  stage: string;
  paymentTerms: string | null;
  creditLimit: string | null;
  salesRepId: string | null;
  salesRep: { id: string; name: string } | null;
}

export interface OrganizationDetailDto extends OrganizationResponseDto {
  partyType: string;
  documentType: string | null;
  stateRegistration: string | null;
  cityRegistration: string | null;
  cnae: string | null;
  registrationStatus: string;
  website: string | null;
  notes: string | null;
  sectorId: string | null;
  sourceId: string | null;
  categoryId: string | null;
  productServices: Array<{ id: string; name: string }>;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  fax: string | null;
  ramal: string | null;
  facebook: string | null;
  twitter: string | null;
  linkedin: string | null;
  skype: string | null;
  instagram: string | null;
  roles: OrgRoleDto[];
  addresses: OrgAddressDto[];
  customerProfile: OrgCustomerProfileDto | null;
}

export function toOrganizationDto(o: OrganizationListItem): OrganizationResponseDto {
  return {
    id: o.id,
    legalName: o.legalName,
    tradeName: o.tradeName,
    document: o.document,
    status: o.status,
    email: o.email,
    phone: o.phone,
    whatsapp: o.whatsapp,
    sector: o.sector,
    category: o.category,
    roleTypes: o.roleTypes,
  };
}

export function toOrgRoleDto(r: OrgRole): OrgRoleDto {
  return { id: r.id, type: r.type, status: r.status };
}

export function toOrgAddressDto(a: OrgAddress): OrgAddressDto {
  return { ...a };
}

export function toOrgCustomerProfileDto(p: OrgCustomerProfile): OrgCustomerProfileDto {
  return { ...p };
}

export function toOrganizationDetailDto(o: OrganizationDetail): OrganizationDetailDto {
  return {
    ...toOrganizationDto(o),
    partyType: o.partyType,
    documentType: o.documentType,
    stateRegistration: o.stateRegistration,
    cityRegistration: o.cityRegistration,
    cnae: o.cnae,
    registrationStatus: o.registrationStatus,
    website: o.website,
    notes: o.notes,
    sectorId: o.sectorId,
    sourceId: o.sourceId,
    categoryId: o.categoryId,
    productServices: o.productServices,
    email: o.email,
    phone: o.phone,
    mobile: o.mobile,
    whatsapp: o.whatsapp,
    fax: o.fax,
    ramal: o.ramal,
    facebook: o.facebook,
    twitter: o.twitter,
    linkedin: o.linkedin,
    skype: o.skype,
    instagram: o.instagram,
    roles: o.roles.map(toOrgRoleDto),
    addresses: o.addresses.map(toOrgAddressDto),
    customerProfile: o.customerProfile ? toOrgCustomerProfileDto(o.customerProfile) : null,
  };
}
