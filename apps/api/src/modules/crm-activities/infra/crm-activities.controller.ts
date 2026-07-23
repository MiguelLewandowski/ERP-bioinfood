import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, UseGuards,
} from '@nestjs/common';
import { ActivityStatus, SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListCrmActivitiesUseCase } from '../application/list-crm-activities.use-case';
import { CreateCrmActivityUseCase } from '../application/create-crm-activity.use-case';
import { UpdateCrmActivityUseCase } from '../application/update-crm-activity.use-case';
import { DeleteCrmActivityUseCase } from '../application/delete-crm-activity.use-case';
import { CreateCrmActivityDto } from './dto/create-crm-activity.dto';
import { UpdateCrmActivityDto } from './dto/update-crm-activity.dto';
import { toCrmActivityDto } from './crm-activity.mapper';
import { DueFilter } from '../domain/crm-activity.entity';

// Prefixo /crm/activities para não colidir com GET /activities (tarefas de
// projeto — módulo `activities` já existente). Ler = todos internos;
// escrever = só ADMIN (§5 do plano de CRM).
@Controller('crm/activities')
@UseGuards(RolesGuard)
@Roles(SystemRole.PADRAO)
export class CrmActivitiesController {
  constructor(
    private listCrmActivities: ListCrmActivitiesUseCase,
    private createCrmActivity: CreateCrmActivityUseCase,
    private updateCrmActivity: UpdateCrmActivityUseCase,
    private deleteCrmActivity: DeleteCrmActivityUseCase,
  ) {}

  @Get()
  async list(
    @Query('orgId') orgId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('due') due?: DueFilter,
    @Query('status') status?: ActivityStatus,
  ) {
    const items = await this.listCrmActivities.execute({
      orgId, opportunityId, responsibleId, due, status,
    });
    return items.map(toCrmActivityDto);
  }

  @Post()
  @Roles(SystemRole.ADMIN)
  async create(@Body() dto: CreateCrmActivityDto) {
    const activity = await this.createCrmActivity.execute({
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
    return toCrmActivityDto(activity);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateCrmActivityDto) {
    const activity = await this.updateCrmActivity.execute(id, {
      ...dto,
      dueDate: dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
    });
    return toCrmActivityDto(activity);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMIN)
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.deleteCrmActivity.execute(id);
  }
}
