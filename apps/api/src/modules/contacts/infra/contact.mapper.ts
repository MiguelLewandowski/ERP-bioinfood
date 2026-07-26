import { ContactDetail, ContactListItem, ContactOrgLink } from '../domain/contact.entity';

export interface ContactListItemDto {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  source: { id: string; name: string } | null;
  organizations: Array<{ id: string; name: string; jobTitle: string | null }>;
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
  linkedin: string | null;
  notes: string | null;
  orgLinks: ContactLinkDto[];
}

export function toContactListItemDto(c: ContactListItem): ContactListItemDto {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    whatsapp: c.whatsapp,
    source: c.source,
    organizations: c.organizations,
    link: c.link,
  };
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
    linkedin: c.linkedin,
    notes: c.notes,
    orgLinks: c.orgLinks.map(toContactLinkDto),
  };
}
