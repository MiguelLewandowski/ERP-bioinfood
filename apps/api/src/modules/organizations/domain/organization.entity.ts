import {
  OrganizationStatus, PartyType, DocumentType, RegistrationStatus,
  PartyRoleType, PartyRoleStatus, AddressType, CustomerStage,
} from '@prisma/client';

export interface OrganizationListItem {
  id: string;
  legalName: string;
  tradeName: string | null;
  document: string | null;
  status: OrganizationStatus;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  sector: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  roleTypes: PartyRoleType[];
}

export interface OrgRole {
  id: string;
  type: PartyRoleType;
  status: PartyRoleStatus;
}

export interface OrgAddress {
  id: string;
  type: AddressType;
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

export interface OrgCustomerProfile {
  stage: CustomerStage;
  paymentTerms: string | null;
  creditLimit: string | null; // Decimal serialized as string
  salesRepId: string | null;
  salesRep: { id: string; name: string } | null; // responsável — decisão 1 do crm-redesign-2026-07
}

export interface OrganizationDetail extends OrganizationListItem {
  partyType: PartyType;
  documentType: DocumentType | null;
  stateRegistration: string | null;
  cityRegistration: string | null;
  cnae: string | null;
  registrationStatus: RegistrationStatus;
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
  roles: OrgRole[];
  addresses: OrgAddress[];
  customerProfile: OrgCustomerProfile | null;
}

export interface CreateOrganizationData {
  legalName: string;
  tradeName?: string;
  document?: string | null;
  documentType?: DocumentType;
  partyType?: PartyType;
  sectorId?: string;
  sourceId?: string;
  categoryId?: string;
  notes?: string;
}

export interface UpdateOrganizationData {
  legalName?: string;
  tradeName?: string;
  document?: string | null;
  documentType?: DocumentType;
  status?: OrganizationStatus;
  stateRegistration?: string;
  cityRegistration?: string;
  cnae?: string;
  registrationStatus?: RegistrationStatus;
  website?: string;
  notes?: string;
  sectorId?: string | null;
  sourceId?: string | null;
  categoryId?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  fax?: string | null;
  ramal?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  skype?: string | null;
  instagram?: string | null;
}

export interface AddressData {
  type?: AddressType;
  isPrimary?: boolean;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface CustomerProfileData {
  stage?: CustomerStage;
  paymentTerms?: string | null;
  creditLimit?: number | null;
  salesRepId?: string | null;
}

export interface StaleOrganization {
  id: string;
  legalName: string;
  tradeName: string | null;
  lastInteractionAt: string | null;
}

// CNPJ/CPF stored as digits only. Deduplication and lookups use this form.
export function normalizeDocument(doc?: string | null): string | null {
  if (!doc) return null;
  const digits = doc.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}
