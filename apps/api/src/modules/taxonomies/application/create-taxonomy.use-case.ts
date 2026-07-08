import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { ITaxonomyRepository, TAXONOMY_REPOSITORY } from '../domain/taxonomy.repository';
import { CreateTaxonomyData, TaxonomyKind } from '../domain/taxonomy.entity';

@Injectable()
export class CreateTaxonomyUseCase {
  constructor(@Inject(TAXONOMY_REPOSITORY) private repo: ITaxonomyRepository) {}

  async execute(kind: TaxonomyKind, data: CreateTaxonomyData) {
    try {
      return await this.repo.create(kind, data);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Já existe um item com esse nome');
      throw err;
    }
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}
