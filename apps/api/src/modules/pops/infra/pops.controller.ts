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

// POP é catálogo global (docs/regras-negocio/pop.md) — sem :projectId na rota.
// Operação interna: CLIENTE nunca acessa (sem ProjectAccess pra filtrar algo
// que não pertence a projeto nenhum).
@Controller('pops')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN, SystemRole.APROVA, SystemRole.INSERE, SystemRole.CONSULTA)
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
  async list() {
    const pops = await this.listPops.execute();
    return pops.map(toPopListItemDto);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const pop = await this.getPop.execute(id);
    return toPopDetailDto(pop);
  }

  @Post()
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async create(@Body() dto: CreatePopDto, @CurrentUser() user: { id: string }) {
    const pop = await this.createPop.execute({ ...dto, createdById: user.id });
    return toPopDetailDto(pop);
  }

  @Patch(':id')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdatePopDto) {
    const pop = await this.updatePop.execute(id, dto);
    return toPopDetailDto(pop);
  }

  @Post(':id/versions')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async createVersion(
    @Param('id') id: string,
    @Body() dto: CreatePopVersionDto,
    @CurrentUser() user: { id: string },
  ) {
    const pop = await this.createPopVersion.execute(id, { ...dto, createdById: user.id });
    return toPopDetailDto(pop);
  }

  @Delete(':id')
  @Roles(SystemRole.APROVA, SystemRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.deletePop.execute(id);
  }
}
