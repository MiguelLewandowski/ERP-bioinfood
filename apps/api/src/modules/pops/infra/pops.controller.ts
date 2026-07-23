import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
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
import { CreatePopCategoryDto, UpdatePopCategoryDto } from './dto/pop-category.dto';
import { ManagePopCategoriesUseCase } from '../application/manage-pop-categories.use-case';
import { toPopCategoryDto, toPopDetailDto, toPopListItemDto } from './pop.mapper';

// POP é catálogo global (docs/regras-negocio/pop.md) — sem :projectId na rota.
// Operação interna: CLIENTE nunca acessa (sem ProjectAccess pra filtrar algo
// que não pertence a projeto nenhum).
@Controller('pops')
@UseGuards(RolesGuard)
@Roles(SystemRole.PADRAO)
export class PopsController {
  constructor(
    private listPops: ListPopsUseCase,
    private getPop: GetPopUseCase,
    private createPop: CreatePopUseCase,
    private updatePop: UpdatePopUseCase,
    private createPopVersion: CreatePopVersionUseCase,
    private deletePop: DeletePopUseCase,
    private categories: ManagePopCategoriesUseCase,
  ) {}

  @Get()
  async list(@Query('search') search?: string, @Query('categoryId') categoryId?: string) {
    const pops = await this.listPops.execute({ search, categoryId });
    return pops.map(toPopListItemDto);
  }

  // Antes de ':id', senão 'categories' cairia na rota de detalhe.
  @Get('categories')
  async listCategories() {
    const categories = await this.categories.list();
    return categories.map(toPopCategoryDto);
  }

  @Post('categories')
  @Roles(SystemRole.ADMIN)
  async createCategory(@Body() dto: CreatePopCategoryDto) {
    return toPopCategoryDto(await this.categories.create(dto.name));
  }

  @Patch('categories/:id')
  @Roles(SystemRole.ADMIN)
  async updateCategory(@Param('id') id: string, @Body() dto: UpdatePopCategoryDto) {
    return toPopCategoryDto(await this.categories.update(id, dto));
  }

  @Delete('categories/:id')
  @Roles(SystemRole.ADMIN)
  removeCategory(@Param('id') id: string) {
    return this.categories.remove(id);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const pop = await this.getPop.execute(id);
    return toPopDetailDto(pop);
  }

  @Post()
  @Roles(SystemRole.PADRAO)
  async create(@Body() dto: CreatePopDto, @CurrentUser() user: { id: string }) {
    const pop = await this.createPop.execute({ ...dto, createdById: user.id });
    return toPopDetailDto(pop);
  }

  @Patch(':id')
  @Roles(SystemRole.PADRAO)
  async update(@Param('id') id: string, @Body() dto: UpdatePopDto) {
    const pop = await this.updatePop.execute(id, dto);
    return toPopDetailDto(pop);
  }

  @Post(':id/versions')
  @Roles(SystemRole.PADRAO)
  async createVersion(
    @Param('id') id: string,
    @Body() dto: CreatePopVersionDto,
    @CurrentUser() user: { id: string },
  ) {
    const pop = await this.createPopVersion.execute(id, { ...dto, createdById: user.id });
    return toPopDetailDto(pop);
  }

  @Delete(':id')
  @Roles(SystemRole.PADRAO)
  remove(@Param('id') id: string) {
    return this.deletePop.execute(id);
  }
}
