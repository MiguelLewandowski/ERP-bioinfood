import {
  CreateTaxonomyData,
  ReorderItem,
  TaxonomyItem,
  TaxonomyKind,
  UpdateTaxonomyData,
} from './taxonomy.entity';

export const TAXONOMY_REPOSITORY = 'TAXONOMY_REPOSITORY';

export interface ITaxonomyRepository {
  findAll(kind: TaxonomyKind, includeInactive: boolean): Promise<TaxonomyItem[]>;
  findById(kind: TaxonomyKind, id: string): Promise<TaxonomyItem | null>;
  create(kind: TaxonomyKind, data: CreateTaxonomyData): Promise<TaxonomyItem>;
  update(kind: TaxonomyKind, id: string, data: UpdateTaxonomyData): Promise<TaxonomyItem>;
  remove(kind: TaxonomyKind, id: string): Promise<void>;
  reorder(kind: TaxonomyKind, items: ReorderItem[]): Promise<void>;
}
