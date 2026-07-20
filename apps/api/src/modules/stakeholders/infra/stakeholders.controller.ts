import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListStakeholdersUseCase } from '../application/list-stakeholders.use-case';
import { CreateStakeholderUseCase } from '../application/create-stakeholder.use-case';
import { UpdateStakeholderUseCase } from '../application/update-stakeholder.use-case';
import { DeleteStakeholderUseCase } from '../application/delete-stakeholder.use-case';
import { CreateStakeholderDto } from './dto/create-stakeholder.dto';
import { UpdateStakeholderDto } from './dto/update-stakeholder.dto';
import { toStakeholderDto } from './stakeholder.mapper';

@Controller('projects/:projectId/stakeholders')
@UseGuards(RolesGuard)
export class StakeholdersController {
  constructor(
    private listStakeholders: ListStakeholdersUseCase,
    private createStakeholder: CreateStakeholderUseCase,
    private updateStakeholder: UpdateStakeholderUseCase,
    private deleteStakeholder: DeleteStakeholderUseCase,
  ) {}

  @Get()
  async list(@Param('projectId') projectId: string) {
    const stakeholders = await this.listStakeholders.execute(projectId);
    return stakeholders.map(toStakeholderDto);
  }

  @Post()
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async create(@Param('projectId') projectId: string, @Body() dto: CreateStakeholderDto) {
    const stakeholder = await this.createStakeholder.execute({ ...dto, projectId });
    return toStakeholderDto(stakeholder);
  }

  @Patch(':id')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStakeholderDto,
  ) {
    const stakeholder = await this.updateStakeholder.execute(projectId, id, dto);
    return toStakeholderDto(stakeholder);
  }

  @Delete(':id')
  @Roles(SystemRole.APROVA, SystemRole.ADMIN)
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.deleteStakeholder.execute(projectId, id);
  }
}
