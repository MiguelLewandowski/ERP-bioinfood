import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { USER_REPOSITORY } from '../domain/user.repository';
import { UsersPrismaRepository } from './users.prisma.repository';
import { UsersController } from './users.controller';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { GetUserUseCase } from '../application/get-user.use-case';
import { UpdateUserUseCase } from '../application/update-user.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: UsersPrismaRepository },
    CreateUserUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
  ],
})
export class UsersModule {}
