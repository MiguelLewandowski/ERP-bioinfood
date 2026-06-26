import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PROJECT_REPOSITORY } from '../domain/project.repository';
import { ProjectsPrismaRepository } from './projects.prisma.repository';
import { ProjectsController } from './projects.controller';
import { ListProjectsUseCase } from '../application/list-projects.use-case';
import { CreateProjectUseCase } from '../application/create-project.use-case';
import { GetProjectUseCase } from '../application/get-project.use-case';
import { UpdateProjectUseCase } from '../application/update-project.use-case';
import { CancelProjectUseCase } from '../application/cancel-project.use-case';
import { GrantAccessUseCase } from '../application/grant-access.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [
    { provide: PROJECT_REPOSITORY, useClass: ProjectsPrismaRepository },
    ListProjectsUseCase,
    CreateProjectUseCase,
    GetProjectUseCase,
    UpdateProjectUseCase,
    CancelProjectUseCase,
    GrantAccessUseCase,
  ],
})
export class ProjectsModule {}
