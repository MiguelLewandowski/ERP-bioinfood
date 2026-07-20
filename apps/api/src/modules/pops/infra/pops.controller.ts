import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ListPopsUseCase } from '../application/list-pops.use-case';
import { GetPopUseCase } from '../application/get-pop.use-case';
import { CreatePopUseCase } from '../application/create-pop.use-case';
import { UpdatePopUseCase } from '../application/update-pop.use-case';
import { CreatePopVersionUseCase } from '../application/create-pop-version.use-case';
import { DeletePopUseCase } from '../application/delete-pop.use-case';
import { CreatePopDto } from './dto/create-pop.dto';
import { UpdatePopDto } from './dto/update-pop.dto';
import { CreatePopVersionDto } from './dto/create-pop-version.dto';
import { toPopDetailDto, toPopListItemDto } from './pop.mapper';

@Controller('projects/:projectId/pops')
@UseGuards(RolesGuard)
export class PopsController {
  constructor(
    private listPops: ListPopsUseCase,
    private getPop: GetPopUseCase,
    private createPop: CreatePopUseCase,
    private updatePop: UpdatePopUseCase,
    private createPopVersion: CreatePopVersionUseCase,
    private deletePop: DeletePopUseCase,
  ) {}

  @Get()
  async list(@Param('projectId') projectId: string) {
    const pops = await this.listPops.execute(projectId);
    return pops.map(toPopListItemDto);
  }

  @Get(':id')
  async get(@Param('projectId') projectId: string, @Param('id') id: string) {
    const pop = await this.getPop.execute(projectId, id);
    return toPopDetailDto(pop);
  }

  @Post()
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreatePopDto,
    @CurrentUser() user: { id: string },
  ) {
    const pop = await this.createPop.execute({ ...dto, projectId, createdById: user.id });
    return toPopDetailDto(pop);
  }

  @Patch(':id')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePopDto,
  ) {
    const pop = await this.updatePop.execute(projectId, id, dto);
    return toPopDetailDto(pop);
  }

  @Post(':id/versions')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async createVersion(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: CreatePopVersionDto,
    @CurrentUser() user: { id: string },
  ) {
    const pop = await this.createPopVersion.execute(projectId, id, { ...dto, createdById: user.id });
    return toPopDetailDto(pop);
  }

  @Delete(':id')
  @Roles(SystemRole.APROVA, SystemRole.ADMIN)
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.deletePop.execute(projectId, id);
  }
}
