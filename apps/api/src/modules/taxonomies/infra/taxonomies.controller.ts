import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, NotFoundException,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListTaxonomyUseCase } from '../application/list-taxonomy.use-case';
import { CreateTaxonomyUseCase } from '../application/create-taxonomy.use-case';
import { UpdateTaxonomyUseCase } from '../application/update-taxonomy.use-case';
import { ReorderTaxonomyUseCase } from '../application/reorder-taxonomy.use-case';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { ReorderTaxonomyDto } from './dto/reorder-taxonomy.dto';
import { toTaxonomyDto } from './taxonomy.mapper';
import { TaxonomyKind } from '../domain/taxonomy.entity';

// URL segment -> internal kind. Unknown segments 404 (never leak a Prisma error).
const KIND_BY_PATH: Record<string, TaxonomyKind> = {
  sectors: 'sector',
  sources: 'source',
  'engagement-stages': 'engagementStage',
  categories: 'category',
  'product-services': 'productService',
};

function resolveKind(pathKind: string): TaxonomyKind {
  const kind = KIND_BY_PATH[pathKind];
  if (!kind) throw new NotFoundException('Taxonomia inválida');
  return kind;
}

// Taxonomias são dados mestres internos: CLIENTE nunca acessa.
// Ler = todos os papéis internos; configurar = só ADMIN (decisão 3 do plano).
@Controller('taxonomies')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN, SystemRole.APROVA, SystemRole.INSERE, SystemRole.CONSULTA)
export class TaxonomiesController {
  constructor(
    private listTaxonomy: ListTaxonomyUseCase,
    private createTaxonomy: CreateTaxonomyUseCase,
    private updateTaxonomy: UpdateTaxonomyUseCase,
    private reorderTaxonomy: ReorderTaxonomyUseCase,
  ) {}

  @Get(':kind')
  async list(@Param('kind') pathKind: string, @Query('includeInactive') includeInactive?: string) {
    const items = await this.listTaxonomy.execute(resolveKind(pathKind), includeInactive === 'true');
    return items.map(toTaxonomyDto);
  }

  @Post(':kind')
  @Roles(SystemRole.ADMIN)
  async create(@Param('kind') pathKind: string, @Body() dto: CreateTaxonomyDto) {
    const item = await this.createTaxonomy.execute(resolveKind(pathKind), dto);
    return toTaxonomyDto(item);
  }

  // Declared before ':kind/:id' so the static "reorder" segment wins routing.
  @Patch(':kind/reorder')
  @Roles(SystemRole.ADMIN)
  async reorder(@Param('kind') pathKind: string, @Body() dto: ReorderTaxonomyDto) {
    await this.reorderTaxonomy.execute(resolveKind(pathKind), dto.items);
    return { ok: true };
  }

  @Patch(':kind/:id')
  @Roles(SystemRole.ADMIN)
  async update(
    @Param('kind') pathKind: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaxonomyDto,
  ) {
    const item = await this.updateTaxonomy.execute(resolveKind(pathKind), id, dto);
    return toTaxonomyDto(item);
  }
}
