import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { STOCK_REPOSITORY } from './domain/stock.repository.interface';
import { StockPrismaRepository } from './infra/stock.prisma.repository';
import { StockController } from './infra/stock.controller';
import { ManageStockItemsUseCase } from './application/manage-stock-items.use-case';
import { ManageStockCategoriesUseCase } from './application/manage-stock-categories.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [StockController],
  providers: [
    { provide: STOCK_REPOSITORY, useClass: StockPrismaRepository },
    ManageStockItemsUseCase,
    ManageStockCategoriesUseCase,
  ],
  exports: [STOCK_REPOSITORY],
})
export class StockModule {}
