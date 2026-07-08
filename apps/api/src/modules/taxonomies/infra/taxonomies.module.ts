import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TAXONOMY_REPOSITORY } from '../domain/taxonomy.repository';
import { TaxonomiesPrismaRepository } from './taxonomies.prisma.repository';
import { TaxonomiesController } from './taxonomies.controller';
import { ListTaxonomyUseCase } from '../application/list-taxonomy.use-case';
import { CreateTaxonomyUseCase } from '../application/create-taxonomy.use-case';
import { UpdateTaxonomyUseCase } from '../application/update-taxonomy.use-case';
import { ReorderTaxonomyUseCase } from '../application/reorder-taxonomy.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [TaxonomiesController],
  providers: [
    { provide: TAXONOMY_REPOSITORY, useClass: TaxonomiesPrismaRepository },
    ListTaxonomyUseCase,
    CreateTaxonomyUseCase,
    UpdateTaxonomyUseCase,
    ReorderTaxonomyUseCase,
  ],
})
export class TaxonomiesModule {}
