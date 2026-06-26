import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { GetUserUseCase } from '../application/get-user.use-case';
import { UpdateUserUseCase } from '../application/update-user.use-case';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN)
export class UsersController {
  constructor(
    private createUser: CreateUserUseCase,
    private listUsers: ListUsersUseCase,
    private getUser: GetUserUseCase,
    private updateUser: UpdateUserUseCase,
  ) {}

  @Get()
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.listUsers.execute(Number(page ?? 1), Number(limit ?? 20));
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.createUser.execute(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getUser.execute(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.updateUser.execute(id, dto);
  }
}
