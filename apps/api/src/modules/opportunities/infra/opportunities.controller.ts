import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListOpportunitiesUseCase } from '../application/list-opportunities.use-case';
import { ListOrgOpportunitiesUseCase } from '../application/list-org-opportunities.use-case';
import { CreateOpportunityUseCase } from '../application/create-opportunity.use-case';
import { UpdateOpportunityUseCase } from '../application/update-opportunity.use-case';
import { DeleteOpportunityUseCase } from '../application/delete-opportunity.use-case';
import { MoveOpportunityUseCase } from '../application/move-opportunity.use-case';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto, MoveOpportunityDto } from './dto/update-opportunity.dto';
import { toOpportunityDto } from './opportunity.mapper';

// Ler = todos os papéis internos; escrever/mover = só ADMIN (decisão do owner).
@Controller('opportunities')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN, SystemRole.APROVA, SystemRole.INSERE, SystemRole.CONSULTA)
export class OpportunitiesController {
  constructor(
    private listOpportunities: ListOpportunitiesUseCase,
    private listOrgOpportunities: ListOrgOpportunitiesUseCase,
    private createOpportunity: CreateOpportunityUseCase,
    private updateOpportunity: UpdateOpportunityUseCase,
    private deleteOpportunity: DeleteOpportunityUseCase,
    private moveOpportunity: MoveOpportunityUseCase,
  ) {}

  @Get()
  async list(@Query('pipelineId') pipelineId?: string, @Query('orgId') orgId?: string) {
    if (orgId) return (await this.listOrgOpportunities.execute(orgId)).map(toOpportunityDto);
    if (!pipelineId) throw new BadRequestException('pipelineId ou orgId é obrigatório');
    return (await this.listOpportunities.execute(pipelineId)).map(toOpportunityDto);
  }

  @Post()
  @Roles(SystemRole.ADMIN)
  async create(@Body() dto: CreateOpportunityDto) {
    const opp = await this.createOpportunity.execute({
      ...dto,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
    });
    return toOpportunityDto(opp);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateOpportunityDto) {
    const { expectedCloseDate, ...rest } = dto;
    const opp = await this.updateOpportunity.execute(id, {
      ...rest,
      expectedCloseDate:
        expectedCloseDate === undefined ? undefined : expectedCloseDate ? new Date(expectedCloseDate) : null,
    });
    return toOpportunityDto(opp);
  }

  @Patch(':id/move')
  @Roles(SystemRole.ADMIN)
  async move(@Param('id') id: string, @Body() dto: MoveOpportunityDto) {
    return toOpportunityDto(await this.moveOpportunity.execute(id, dto.stageId, dto.lostReason ?? null));
  }

  @Delete(':id')
  @Roles(SystemRole.ADMIN)
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.deleteOpportunity.execute(id);
  }
}
