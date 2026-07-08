import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { ITaxonomyRepository, TAXONOMY_REPOSITORY } from '../domain/taxonomy.repository';
import { TaxonomyKind, UpdateTaxonomyData } from '../domain/taxonomy.entity';

@Injectable()
export class UpdateTaxonomyUseCase {
  constructor(@Inject(TAXONOMY_REPOSITORY) private repo: ITaxonomyRepository) {}

  async execute(kind: TaxonomyKind, id: string, data: UpdateTaxonomyData) {
    const existing = await this.repo.findById(kind, id);
    if (!existing) throw new NotFoundException('Item não encontrado');
    try {
      return await this.repo.update(kind, id, data);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Já existe um item com esse nome');
      throw err;
    }
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}
