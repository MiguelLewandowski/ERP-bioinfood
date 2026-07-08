import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CRM_ACTIVITY_REPOSITORY } from './domain/crm-activity.repository';
import { CrmActivitiesPrismaRepository } from './infra/crm-activities.prisma.repository';
import { CrmActivitiesController } from './infra/crm-activities.controller';
import { ListCrmActivitiesUseCase } from './application/list-crm-activities.use-case';
import { CreateCrmActivityUseCase } from './application/create-crm-activity.use-case';
import { UpdateCrmActivityUseCase } from './application/update-crm-activity.use-case';
import { DeleteCrmActivityUseCase } from './application/delete-crm-activity.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [CrmActivitiesController],
  providers: [
    { provide: CRM_ACTIVITY_REPOSITORY, useClass: CrmActivitiesPrismaRepository },
    ListCrmActivitiesUseCase,
    CreateCrmActivityUseCase,
    UpdateCrmActivityUseCase,
    DeleteCrmActivityUseCase,
  ],
})
export class CrmActivitiesModule {}
