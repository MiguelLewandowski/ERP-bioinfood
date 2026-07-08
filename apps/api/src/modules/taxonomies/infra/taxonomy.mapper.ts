import { TaxonomyItem } from '../domain/taxonomy.entity';

export interface TaxonomyResponseDto {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

export function toTaxonomyDto(t: TaxonomyItem): TaxonomyResponseDto {
  return {
    id: t.id,
    name: t.name,
    isActive: t.isActive,
    order: t.order,
  };
}
