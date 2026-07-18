import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SEARCH_REPOSITORY } from './domain/search.types';
import { SearchPrismaRepository } from './infra/search.prisma.repository';
import { SearchController } from './infra/search.controller';
import { GlobalSearchUseCase } from './application/global-search.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [
    { provide: SEARCH_REPOSITORY, useClass: SearchPrismaRepository },
    GlobalSearchUseCase,
  ],
})
export class SearchModule {}
