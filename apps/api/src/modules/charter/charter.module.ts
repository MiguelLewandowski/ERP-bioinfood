import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CHARTER_REPOSITORY } from './domain/charter.repository.interface';
import { CharterPrismaRepository } from './infra/charter.prisma.repository';
import { CharterController } from './infra/charter.controller';
import { GetCharterUseCase } from './application/get-charter.use-case';
import { UpsertCharterUseCase } from './application/upsert-charter.use-case';
import { ApproveCharterUseCase } from './application/approve-charter.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [CharterController],
  providers: [
    { provide: CHARTER_REPOSITORY, useClass: CharterPrismaRepository },
    GetCharterUseCase,
    UpsertCharterUseCase,
    ApproveCharterUseCase,
  ],
})
export class CharterModule {}
