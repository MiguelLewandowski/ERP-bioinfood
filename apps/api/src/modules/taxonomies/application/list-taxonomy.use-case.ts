import { Injectable, Inject } from '@nestjs/common';
import { ITaxonomyRepository, TAXONOMY_REPOSITORY } from '../domain/taxonomy.repository';
import { TaxonomyKind } from '../domain/taxonomy.entity';

@Injectable()
export class ListTaxonomyUseCase {
  constructor(@Inject(TAXONOMY_REPOSITORY) private repo: ITaxonomyRepository) {}

  // Consumers (e.g. org form dropdowns) only want active items by default;
  // the admin config screen passes includeInactive to manage the full list.
  execute(kind: TaxonomyKind, includeInactive = false) {
    return this.repo.findAll(kind, includeInactive);
  }
}
