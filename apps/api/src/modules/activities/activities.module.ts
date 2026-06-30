import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ACTIVITIES_REPOSITORY } from './domain/activities.repository.interface';
import { ActivitiesPrismaRepository } from './infra/activities.prisma.repository';
import { ActivitiesController } from './infra/activities.controller';
import { ListActivitiesUseCase } from './application/list-activities.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [ActivitiesController],
  providers: [
    { provide: ACTIVITIES_REPOSITORY, useClass: ActivitiesPrismaRepository },
    ListActivitiesUseCase,
  ],
})
export class ActivitiesModule {}
