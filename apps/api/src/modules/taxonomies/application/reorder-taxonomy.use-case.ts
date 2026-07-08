import { Injectable, Inject } from '@nestjs/common';
import { ITaxonomyRepository, TAXONOMY_REPOSITORY } from '../domain/taxonomy.repository';
import { ReorderItem, TaxonomyKind } from '../domain/taxonomy.entity';

@Injectable()
export class ReorderTaxonomyUseCase {
  constructor(@Inject(TAXONOMY_REPOSITORY) private repo: ITaxonomyRepository) {}

  execute(kind: TaxonomyKind, items: ReorderItem[]) {
    return this.repo.reorder(kind, items);
  }
}
