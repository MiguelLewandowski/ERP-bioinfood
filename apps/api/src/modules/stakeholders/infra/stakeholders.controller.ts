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
  list(@Param('projectId') projectId: string) {
    return this.listStakeholders.execute(projectId);
  }

  @Post()
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  create(@Param('projectId') projectId: string, @Body() dto: CreateStakeholderDto) {
    return this.createStakeholder.execute({ ...dto, projectId });
  }

  @Patch(':id')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStakeholderDto,
  ) {
    return this.updateStakeholder.execute(projectId, id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.APROVA, SystemRole.ADMIN)
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.deleteStakeholder.execute(projectId, id);
  }
}
