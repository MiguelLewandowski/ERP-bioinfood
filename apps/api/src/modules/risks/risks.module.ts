import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RISK_REPOSITORY } from './domain/risks.repository.interface';
import { RisksPrismaRepository } from './infra/risks.prisma.repository';
import { RisksController } from './infra/risks.controller';
import { ListRisksUseCase } from './application/list-risks.use-case';
import { CreateRiskUseCase } from './application/create-risk.use-case';
import { UpdateRiskUseCase } from './application/update-risk.use-case';
import { DeleteRiskUseCase } from './application/delete-risk.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [RisksController],
  providers: [
    { provide: RISK_REPOSITORY, useClass: RisksPrismaRepository },
    ListRisksUseCase,
    CreateRiskUseCase,
    UpdateRiskUseCase,
    DeleteRiskUseCase,
  ],
})
export class RisksModule {}
