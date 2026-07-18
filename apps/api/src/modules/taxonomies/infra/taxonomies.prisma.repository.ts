import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ITaxonomyRepository } from '../domain/taxonomy.repository';
import {
  CreateTaxonomyData,
  ReorderItem,
  TaxonomyItem,
  TaxonomyKind,
  UpdateTaxonomyData,
} from '../domain/taxonomy.entity';

const SELECT = { id: true, name: true, isActive: true, order: true } as const;

@Injectable()
export class TaxonomiesPrismaRepository implements ITaxonomyRepository {
  constructor(private prisma: PrismaService) {}

  // The three taxonomy models are field-identical, so the sector delegate type
  // safely stands in for all of them. Only the delegate identity is cast (the
  // shared shape guarantees the call signatures match); call sites stay typed.
  private delegate(kind: TaxonomyKind): typeof this.prisma.sector {
    type SectorDelegate = typeof this.prisma.sector;
    switch (kind) {
      case 'sector':
        return this.prisma.sector;
      case 'source':
        return this.prisma.organizationSource as unknown as SectorDelegate;
      case 'engagementStage':
        return this.prisma.engagementStage as unknown as SectorDelegate;
      case 'category':
        return this.prisma.category as unknown as SectorDelegate;
      case 'productService':
        return this.prisma.productService as unknown as SectorDelegate;
    }
  }

  findAll(kind: TaxonomyKind, includeInactive: boolean): Promise<TaxonomyItem[]> {
    return this.delegate(kind).findMany({
      where: includeInactive ? undefined : { isActive: true },
      select: SELECT,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      take: 200,
    });
  }

  findById(kind: TaxonomyKind, id: string): Promise<TaxonomyItem | null> {
    return this.delegate(kind).findUnique({ where: { id }, select: SELECT });
  }

  create(kind: TaxonomyKind, data: CreateTaxonomyData): Promise<TaxonomyItem> {
    return this.delegate(kind).create({ data, select: SELECT });
  }

  update(kind: TaxonomyKind, id: string, data: UpdateTaxonomyData): Promise<TaxonomyItem> {
    return this.delegate(kind).update({ where: { id }, data, select: SELECT });
  }

  async reorder(kind: TaxonomyKind, items: ReorderItem[]): Promise<void> {
    const delegate = this.delegate(kind);
    await this.prisma.$transaction(
      items.map((item) => delegate.update({ where: { id: item.id }, data: { order: item.order } })),
    );
  }
}
