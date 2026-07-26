export interface ContactListItem {
  id: string;
  name: string;
  email: string | null;
  // WhatsApp é o único telefone que os formulários coletam. `phone`/`mobile`
  // continuam no banco, mas ficavam sempre vazios nas telas que os exibiam.
  whatsapp: string | null;
  source: { id: string; name: string } | null;
  // Empresas às quais a pessoa está vinculada, com o cargo em cada uma.
  organizations: Array<{ id: string; name: string; jobTitle: string | null }>;
  // Present only when the list is filtered by organization: identifies the link
  // so the org's contact tab can edit or unlink it.
  link?: {
    linkId: string;
    jobTitle: string | null;
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

// Só o que os formulários de pessoa realmente editam. As demais colunas
// (cpf, fax, ramal, nascimento, outras redes) seguem no banco, fora das telas.
export interface ContactDetail extends ContactListItem {
  linkedin: string | null;
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
  sourceId?: string;
}

export type UpdateContactData = Omit<Partial<CreateContactData>, 'sourceId'> & { sourceId?: string | null };

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
