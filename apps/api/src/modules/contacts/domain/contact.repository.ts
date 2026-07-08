import {
  ContactDetail,
  ContactListFilter,
  ContactListItem,
  ContactOrgLink,
  CreateContactData,
  CreateLinkData,
  UpdateContactData,
  UpdateLinkData,
} from './contact.entity';

export const CONTACT_REPOSITORY = 'CONTACT_REPOSITORY';

export interface IContactRepository {
  findAll(filter: ContactListFilter): Promise<ContactListItem[]>;
  findById(id: string): Promise<ContactDetail | null>;
  create(data: CreateContactData): Promise<ContactListItem>;
  update(id: string, data: UpdateContactData): Promise<ContactListItem>;
  softDelete(id: string): Promise<void>;

  // Links — always scoped by contactId to prevent cross-contact access (IDOR).
  findLink(contactId: string, linkId: string): Promise<ContactOrgLink | null>;
  addLink(contactId: string, data: CreateLinkData): Promise<ContactOrgLink>;
  updateLink(linkId: string, data: UpdateLinkData): Promise<ContactOrgLink>;
  removeLink(linkId: string): Promise<void>;
  // Enforces "one primary contact per organization".
  clearPrimaryForOrg(orgId: string, exceptLinkId?: string): Promise<void>;
}
