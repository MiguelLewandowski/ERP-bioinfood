import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { STAKEHOLDER_REPOSITORY } from './domain/stakeholders.repository.interface';
import { StakeholdersPrismaRepository } from './infra/stakeholders.prisma.repository';
import { StakeholdersController } from './infra/stakeholders.controller';
import { ListStakeholdersUseCase } from './application/list-stakeholders.use-case';
import { CreateStakeholderUseCase } from './application/create-stakeholder.use-case';
import { UpdateStakeholderUseCase } from './application/update-stakeholder.use-case';
import { DeleteStakeholderUseCase } from './application/delete-stakeholder.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [StakeholdersController],
  providers: [
    { provide: STAKEHOLDER_REPOSITORY, useClass: StakeholdersPrismaRepository },
    ListStakeholdersUseCase,
    CreateStakeholderUseCase,
    UpdateStakeholderUseCase,
    DeleteStakeholderUseCase,
  ],
})
export class StakeholdersModule {}
