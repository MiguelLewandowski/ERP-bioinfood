import { SystemRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: SystemRole;
}

export type SearchResultType = 'project' | 'organization' | 'opportunity' | 'contact';

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  /** Id auxiliar para montar o link no frontend (orgId em contato/oportunidade). */
  refId: string | null;
}

export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');

export interface SearchRepository {
  searchProjects(q: string, limit: number, onlyAccessibleToUserId?: string): Promise<SearchResultItem[]>;
  searchOrganizations(q: string, limit: number): Promise<SearchResultItem[]>;
  searchOpportunities(q: string, limit: number): Promise<SearchResultItem[]>;
  searchContacts(q: string, limit: number): Promise<SearchResultItem[]>;
}
