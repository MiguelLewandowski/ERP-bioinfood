import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ProjectsModule } from '../../projects/infra/projects.module';
import { USER_REPOSITORY } from '../domain/user.repository';
import { UsersPrismaRepository } from './users.prisma.repository';
import { UsersController } from './users.controller';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { GetUserUseCase } from '../application/get-user.use-case';
import { UpdateUserUseCase } from '../application/update-user.use-case';
import { ResetPasswordUseCase } from '../application/reset-password.use-case';
import { ListUserProjectAccessUseCase } from '../application/list-user-project-access.use-case';

@Module({
  imports: [PrismaModule, ProjectsModule],
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: UsersPrismaRepository },
    CreateUserUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    ResetPasswordUseCase,
    ListUserProjectAccessUseCase,
  ],
})
export class UsersModule {}
