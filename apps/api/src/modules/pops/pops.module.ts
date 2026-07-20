import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { POP_REPOSITORY } from './domain/pops.repository.interface';
import { PopsPrismaRepository } from './infra/pops.prisma.repository';
import { PopsController } from './infra/pops.controller';
import { ListPopsUseCase } from './application/list-pops.use-case';
import { GetPopUseCase } from './application/get-pop.use-case';
import { CreatePopUseCase } from './application/create-pop.use-case';
import { UpdatePopUseCase } from './application/update-pop.use-case';
import { CreatePopVersionUseCase } from './application/create-pop-version.use-case';
import { DeletePopUseCase } from './application/delete-pop.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [PopsController],
  providers: [
    { provide: POP_REPOSITORY, useClass: PopsPrismaRepository },
    ListPopsUseCase,
    GetPopUseCase,
    CreatePopUseCase,
    UpdatePopUseCase,
    CreatePopVersionUseCase,
    DeletePopUseCase,
  ],
  exports: [POP_REPOSITORY],
})
export class PopsModule {}
