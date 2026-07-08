import { ContactDetail, ContactListItem, ContactOrgLink } from '../domain/contact.entity';

export interface ContactListItemDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  link?: ContactListItem['link'];
}

export interface ContactLinkDto {
  id: string;
  orgId: string;
  organization: { id: string; legalName: string; tradeName: string | null };
  jobTitle: string | null;
  department: string | null;
  isDecision: boolean;
  isFinance: boolean;
  isTechnical: boolean;
  isPrimary: boolean;
  isActive: boolean;
}

export interface ContactDetailDto extends ContactListItemDto {
  cpf: string | null;
  whatsapp: string | null;
  fax: string | null;
  ramal: string | null;
  birthDate: string | null;
  facebook: string | null;
  twitter: string | null;
  linkedin: string | null;
  skype: string | null;
  instagram: string | null;
  notes: string | null;
  orgLinks: ContactLinkDto[];
}

export function toContactListItemDto(c: ContactListItem): ContactListItemDto {
  return { id: c.id, name: c.name, email: c.email, phone: c.phone, mobile: c.mobile, link: c.link };
}

export function toContactLinkDto(l: ContactOrgLink): ContactLinkDto {
  return {
    id: l.id,
    orgId: l.orgId,
    organization: l.organization,
    jobTitle: l.jobTitle,
    department: l.department,
    isDecision: l.isDecision,
    isFinance: l.isFinance,
    isTechnical: l.isTechnical,
    isPrimary: l.isPrimary,
    isActive: l.isActive,
  };
}

export function toContactDetailDto(c: ContactDetail): ContactDetailDto {
  return {
    ...toContactListItemDto(c),
    cpf: c.cpf,
    whatsapp: c.whatsapp,
    fax: c.fax,
    ramal: c.ramal,
    birthDate: c.birthDate?.toISOString() ?? null,
    facebook: c.facebook,
    twitter: c.twitter,
    linkedin: c.linkedin,
    skype: c.skype,
    instagram: c.instagram,
    notes: c.notes,
    orgLinks: c.orgLinks.map(toContactLinkDto),
  };
}
