import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { GetUserUseCase } from '../application/get-user.use-case';
import { UpdateUserUseCase } from '../application/update-user.use-case';
import { ResetPasswordUseCase } from '../application/reset-password.use-case';
import { ListUserProjectAccessUseCase } from '../application/list-user-project-access.use-case';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    private createUser: CreateUserUseCase,
    private listUsers: ListUsersUseCase,
    private getUser: GetUserUseCase,
    private updateUser: UpdateUserUseCase,
    private resetPassword: ResetPasswordUseCase,
    private listUserProjectAccess: ListUserProjectAccessUseCase,
  ) {}

  @Get()
  @Roles(SystemRole.ADMIN, SystemRole.APROVA)
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.listUsers.execute(Number(page ?? 1), Number(limit ?? 20));
  }

  @Post()
  @Roles(SystemRole.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.createUser.execute(dto);
  }

  @Get(':id')
  @Roles(SystemRole.ADMIN, SystemRole.APROVA)
  get(@Param('id') id: string) {
    return this.getUser.execute(id);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.updateUser.execute(id, dto);
  }

  @Patch(':id/reset-password')
  @Roles(SystemRole.ADMIN)
  resetUserPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.resetPassword.execute(id, dto.newPassword);
  }

  @Get(':id/project-access')
  @Roles(SystemRole.ADMIN, SystemRole.APROVA)
  listAccess(@Param('id') id: string) {
    return this.listUserProjectAccess.execute(id);
  }
}
