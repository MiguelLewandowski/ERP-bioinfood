import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MILESTONE_REPOSITORY } from './domain/milestones.repository.interface';
import { MilestonesPrismaRepository } from './infra/milestones.prisma.repository';
import { MilestonesController } from './infra/milestones.controller';
import { ListMilestonesUseCase } from './application/list-milestones.use-case';
import { CreateMilestoneUseCase } from './application/create-milestone.use-case';
import { UpdateMilestoneUseCase } from './application/update-milestone.use-case';
import { DeleteMilestoneUseCase } from './application/delete-milestone.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [MilestonesController],
  providers: [
    { provide: MILESTONE_REPOSITORY, useClass: MilestonesPrismaRepository },
    ListMilestonesUseCase,
    CreateMilestoneUseCase,
    UpdateMilestoneUseCase,
    DeleteMilestoneUseCase,
  ],
})
export class MilestonesModule {}
