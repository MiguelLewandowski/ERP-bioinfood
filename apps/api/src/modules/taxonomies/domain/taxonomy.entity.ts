// Master-data taxonomies share the same shape (name + isActive + order),
// so they are handled generically, discriminated by TaxonomyKind.
export type TaxonomyKind = 'sector' | 'source' | 'engagementStage' | 'category' | 'productService';

export interface TaxonomyItem {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

export interface CreateTaxonomyData {
  name: string;
  order?: number;
}

export interface UpdateTaxonomyData {
  name?: string;
  isActive?: boolean;
  order?: number;
}

export interface ReorderItem {
  id: string;
  order: number;
}
