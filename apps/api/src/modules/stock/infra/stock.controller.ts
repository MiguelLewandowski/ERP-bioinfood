import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ManageStockItemsUseCase } from '../application/manage-stock-items.use-case';
import { ManageStockCategoriesUseCase } from '../application/manage-stock-categories.use-case';
import {
  CreateStockCategoryDto,
  CreateStockItemDto,
  UpdateStockCategoryDto,
  UpdateStockItemDto,
} from './dto/stock-item.dto';
import { toStockCategoryDto, toStockItemDto } from './stock.mapper';

/**
 * Cadastro de estoque — catálogo global, sem :projectId na rota.
 *
 * Operação interna: CLIENTE não entra. Mesmo recorte dos POPs — @Roles(PADRAO)
 * na classe barra CLIENTE em tudo, e ADMIN atravessa por design do RolesGuard.
 * A leitura precisa ficar aberta a PADRAO porque a checklist do TAP consome
 * esta lista.
 */
@Controller('stock')
@UseGuards(RolesGuard)
@Roles(SystemRole.PADRAO)
export class StockController {
  constructor(
    private items: ManageStockItemsUseCase,
    private categories: ManageStockCategoriesUseCase,
  ) {}

  // 'categories' vem ANTES de ':id', senão cairia na rota de detalhe do item.
  @Get('categories')
  async listCategories() {
    const rows = await this.categories.list();
    return rows.map(toStockCategoryDto);
  }

  @Post('categories')
  @Roles(SystemRole.ADMIN)
  async createCategory(@Body() dto: CreateStockCategoryDto) {
    return toStockCategoryDto(await this.categories.create(dto.name));
  }

  @Patch('categories/:id')
  @Roles(SystemRole.ADMIN)
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateStockCategoryDto) {
    return toStockCategoryDto(await this.categories.update(id, dto));
  }

  @Delete('categories/:id')
  @Roles(SystemRole.ADMIN)
  removeCategory(@Param('id') id: string) {
    return this.categories.remove(id);
  }

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ) {
    const rows = await this.items.list({ search, categoryId, status });
    return rows.map(toStockItemDto);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return toStockItemDto(await this.items.get(id));
  }

  @Post()
  @Roles(SystemRole.PADRAO)
  async create(@Body() dto: CreateStockItemDto) {
    return toStockItemDto(await this.items.create(dto));
  }

  @Patch(':id')
  @Roles(SystemRole.PADRAO)
  async update(@Param('id') id: string, @Body() dto: UpdateStockItemDto) {
    return toStockItemDto(await this.items.update(id, dto));
  }

  @Delete(':id')
  @Roles(SystemRole.PADRAO)
  remove(@Param('id') id: string) {
    return this.items.remove(id);
  }
}
