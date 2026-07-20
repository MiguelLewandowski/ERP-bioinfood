import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListRisksUseCase } from '../application/list-risks.use-case';
import { CreateRiskUseCase } from '../application/create-risk.use-case';
import { UpdateRiskUseCase } from '../application/update-risk.use-case';
import { DeleteRiskUseCase } from '../application/delete-risk.use-case';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { toRiskDto } from './risk.mapper';

@Controller('projects/:projectId/risks')
@UseGuards(RolesGuard)
export class RisksController {
  constructor(
    private listRisks: ListRisksUseCase,
    private createRisk: CreateRiskUseCase,
    private updateRisk: UpdateRiskUseCase,
    private deleteRisk: DeleteRiskUseCase,
  ) {}

  @Get()
  async list(@Param('projectId') projectId: string) {
    const risks = await this.listRisks.execute(projectId);
    return risks.map(toRiskDto);
  }

  @Post()
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async create(@Param('projectId') projectId: string, @Body() dto: CreateRiskDto) {
    const risk = await this.createRisk.execute({ ...dto, projectId });
    return toRiskDto(risk);
  }

  @Patch(':id')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRiskDto,
  ) {
    const risk = await this.updateRisk.execute(projectId, id, dto);
    return toRiskDto(risk);
  }

  @Delete(':id')
  @Roles(SystemRole.APROVA, SystemRole.ADMIN)
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.deleteRisk.execute(projectId, id);
  }
}
