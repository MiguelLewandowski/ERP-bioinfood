export interface ContactListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  // Present only when the list is filtered by organization: the link markers
  // for that org, so the org's contact tab can show decisor/primary/etc.
  link?: {
    linkId: string;
    jobTitle: string | null;
    isDecision: boolean;
    isFinance: boolean;
    isTechnical: boolean;
    isPrimary: boolean;
  } | null;
}

export interface ContactOrgLink {
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

export interface ContactDetail extends ContactListItem {
  cpf: string | null;
  whatsapp: string | null;
  fax: string | null;
  ramal: string | null;
  birthDate: Date | null;
  facebook: string | null;
  twitter: string | null;
  linkedin: string | null;
  skype: string | null;
  instagram: string | null;
  notes: string | null;
  orgLinks: ContactOrgLink[];
}

export interface CreateContactData {
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  fax?: string;
  ramal?: string;
  birthDate?: Date;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  skype?: string;
  instagram?: string;
  notes?: string;
}

export type UpdateContactData = Partial<CreateContactData>;

export interface CreateLinkData {
  orgId: string;
  jobTitle?: string;
  department?: string;
  isDecision?: boolean;
  isFinance?: boolean;
  isTechnical?: boolean;
  isPrimary?: boolean;
}

export type UpdateLinkData = Partial<Omit<CreateLinkData, 'orgId'>> & { isActive?: boolean };

export interface ContactListFilter {
  orgId?: string;
  search?: string;
}
