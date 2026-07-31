import {
  Controller, Get, Put, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GetCharterUseCase } from '../application/get-charter.use-case';
import { UpsertCharterUseCase } from '../application/upsert-charter.use-case';
import { ApproveCharterUseCase } from '../application/approve-charter.use-case';
import { ManageCharterEquipmentUseCase } from '../application/manage-charter-equipment.use-case';
import { UpsertCharterDto } from './dto/upsert-charter.dto';
import { AddCharterEquipmentDto, UpdateCharterEquipmentDto } from './dto/charter-equipment.dto';
import { toCharterDto } from './charter.mapper';
import { toCharterEquipmentDto } from './charter-equipment.mapper';

@Controller('projects/:projectId/charter')
@UseGuards(RolesGuard)
export class CharterController {
  constructor(
    private getCharter: GetCharterUseCase,
    private upsertCharter: UpsertCharterUseCase,
    private approveCharter: ApproveCharterUseCase,
    private equipment: ManageCharterEquipmentUseCase,
  ) {}

  // 'equipment' antes das rotas genéricas do TAP para não colidir.
  @Get('equipment')
  async listEquipment(@Param('projectId') projectId: string) {
    const rows = await this.equipment.list(projectId);
    return rows.map(toCharterEquipmentDto);
  }

  @Post('equipment')
  @Roles(SystemRole.PADRAO)
  async addEquipment(
    @Param('projectId') projectId: string,
    @Body() dto: AddCharterEquipmentDto,
  ) {
    return toCharterEquipmentDto(await this.equipment.add(projectId, dto.stockItemId));
  }

  @Patch('equipment/:id')
  @Roles(SystemRole.PADRAO)
  async updateEquipment(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCharterEquipmentDto,
  ) {
    return toCharterEquipmentDto(await this.equipment.update(projectId, id, dto));
  }

  @Delete('equipment/:id')
  @Roles(SystemRole.PADRAO)
  removeEquipment(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.equipment.remove(projectId, id);
  }

  @Get()
  async get(@Param('projectId') projectId: string) {
    const charter = await this.getCharter.execute(projectId);
    return charter ? toCharterDto(charter) : null;
  }

  @Put()
  @Roles(SystemRole.PADRAO)
  async upsert(@Param('projectId') projectId: string, @Body() dto: UpsertCharterDto) {
    const charter = await this.upsertCharter.execute(projectId, dto);
    return toCharterDto(charter);
  }

  @Post('approve')
  @Roles(SystemRole.PADRAO)
  async approve(@Param('projectId') projectId: string, @CurrentUser() user: { id: string }) {
    const charter = await this.approveCharter.execute(projectId, user.id);
    return toCharterDto(charter);
  }
}
