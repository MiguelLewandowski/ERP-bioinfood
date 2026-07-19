import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { ITaxonomyRepository, TAXONOMY_REPOSITORY } from '../domain/taxonomy.repository';
import { TaxonomyKind } from '../domain/taxonomy.entity';

@Injectable()
export class DeleteTaxonomyUseCase {
  constructor(@Inject(TAXONOMY_REPOSITORY) private repo: ITaxonomyRepository) {}

  async execute(kind: TaxonomyKind, id: string) {
    const existing = await this.repo.findById(kind, id);
    if (!existing) throw new NotFoundException('Item não encontrado');
    try {
      await this.repo.remove(kind, id);
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new ConflictException('Item em uso — desative em vez de excluir');
      }
      throw err;
    }
  }
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2003';
}
