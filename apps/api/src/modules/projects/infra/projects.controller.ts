import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListProjectsUseCase } from '../application/list-projects.use-case';
import { CreateProjectUseCase } from '../application/create-project.use-case';
import { GetProjectUseCase } from '../application/get-project.use-case';
import { UpdateProjectUseCase } from '../application/update-project.use-case';
import { CancelProjectUseCase } from '../application/cancel-project.use-case';
import { DeleteProjectUseCase } from '../application/delete-project.use-case';
import { GrantAccessUseCase } from '../application/grant-access.use-case';
import { RevokeAccessUseCase } from '../application/revoke-access.use-case';
import { SetBaselineUseCase } from '../application/set-baseline.use-case';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GrantAccessDto } from './dto/grant-access.dto';
import { AuthUser } from '../domain/project.types';
import { toProjectDto } from './project.mapper';

@Controller('projects')
@UseGuards(RolesGuard)
export class ProjectsController {
  constructor(
    private listProjects: ListProjectsUseCase,
    private createProject: CreateProjectUseCase,
    private getProject: GetProjectUseCase,
    private updateProject: UpdateProjectUseCase,
    private cancelProject: CancelProjectUseCase,
    private deleteProject: DeleteProjectUseCase,
    private grantAccess: GrantAccessUseCase,
    private revokeAccess: RevokeAccessUseCase,
    private setBaseline: SetBaselineUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const projects = await this.listProjects.execute(user);
    return projects.map(toProjectDto);
  }

  @Post()
  @Roles(SystemRole.PADRAO)
  async create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    const project = await this.createProject.execute({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      createdById: user.id,
    });
    return toProjectDto(project);
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const project = await this.getProject.execute(id, user);
    return toProjectDto(project);
  }

  @Patch(':id')
  @Roles(SystemRole.PADRAO)
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    const { startDate, endDate, ...rest } = dto;
    const project = await this.updateProject.execute(id, {
      ...rest,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    return toProjectDto(project);
  }

  @Delete(':id')
  @Roles(SystemRole.PADRAO)
  cancel(@Param('id') id: string) {
    return this.cancelProject.execute(id);
  }

  // Exclusão definitiva — apenas ADMIN. Remove o projeto e suas relações (cascade).
  @Delete(':id/permanent')
  @Roles(SystemRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.deleteProject.execute(id);
  }

  @Post(':id/access')
  @Roles(SystemRole.PADRAO)
  access(@Param('id') projectId: string, @Body() dto: GrantAccessDto, @CurrentUser() user: AuthUser) {
    return this.grantAccess.execute(projectId, dto.userId, user.id);
  }

  @Delete(':id/access/:userId')
  @Roles(SystemRole.PADRAO)
  revokeAccessEndpoint(@Param('id') projectId: string, @Param('userId') userId: string) {
    return this.revokeAccess.execute(projectId, userId);
  }

  @Post(':id/baseline')
  @Roles(SystemRole.PADRAO)
  async baseline(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const project = await this.setBaseline.execute(id, user.id);
    return toProjectDto(project);
  }
}
