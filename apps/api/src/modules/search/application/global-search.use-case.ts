import { Inject, Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import {
  AuthUser,
  SEARCH_REPOSITORY,
  SearchRepository,
  SearchResultItem,
} from '../domain/search.types';

const PER_TYPE_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;

@Injectable()
export class GlobalSearchUseCase {
  constructor(@Inject(SEARCH_REPOSITORY) private repo: SearchRepository) {}

  async execute(user: AuthUser, rawQuery: string): Promise<SearchResultItem[]> {
    const q = rawQuery.trim();
    if (q.length < MIN_QUERY_LENGTH) return [];

    // CLIENTE só enxerga os projetos em ProjectAccess; CRM e dados mestres não.
    if (user.role === SystemRole.CLIENTE) {
      return this.repo.searchProjects(q, PER_TYPE_LIMIT, user.id);
    }

    const [projects, organizations, opportunities, contacts] = await Promise.all([
      this.repo.searchProjects(q, PER_TYPE_LIMIT),
      this.repo.searchOrganizations(q, PER_TYPE_LIMIT),
      this.repo.searchOpportunities(q, PER_TYPE_LIMIT),
      this.repo.searchContacts(q, PER_TYPE_LIMIT),
    ]);
    return [...projects, ...organizations, ...opportunities, ...contacts];
  }
}
