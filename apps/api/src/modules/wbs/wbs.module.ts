import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WBS_REPOSITORY } from './domain/wbs.repository.interface';
import { WbsPrismaRepository } from './infra/wbs.prisma.repository';
import { WbsController } from './infra/wbs.controller';
import { ListWbsUseCase } from './application/list-wbs.use-case';
import { CreateWbsNodeUseCase } from './application/create-wbs-node.use-case';
import { UpdateWbsNodeUseCase } from './application/update-wbs-node.use-case';
import { DeleteWbsNodeUseCase } from './application/delete-wbs-node.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [WbsController],
  providers: [
    { provide: WBS_REPOSITORY, useClass: WbsPrismaRepository },
    ListWbsUseCase,
    CreateWbsNodeUseCase,
    UpdateWbsNodeUseCase,
    DeleteWbsNodeUseCase,
  ],
})
export class WbsModule {}
