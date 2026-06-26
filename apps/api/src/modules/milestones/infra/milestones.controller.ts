import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListMilestonesUseCase } from '../application/list-milestones.use-case';
import { CreateMilestoneUseCase } from '../application/create-milestone.use-case';
import { UpdateMilestoneUseCase } from '../application/update-milestone.use-case';
import { DeleteMilestoneUseCase } from '../application/delete-milestone.use-case';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

@Controller('projects/:projectId/milestones')
@UseGuards(RolesGuard)
export class MilestonesController {
  constructor(
    private listMilestones: ListMilestonesUseCase,
    private createMilestone: CreateMilestoneUseCase,
    private updateMilestone: UpdateMilestoneUseCase,
    private deleteMilestone: DeleteMilestoneUseCase,
  ) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.listMilestones.execute(projectId);
  }

  @Post()
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  create(@Param('projectId') projectId: string, @Body() dto: CreateMilestoneDto) {
    return this.createMilestone.execute({
      ...dto,
      projectId,
      date: new Date(dto.date),
    });
  }

  @Patch(':id')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    const { date, ...rest } = dto;
    return this.updateMilestone.execute(projectId, id, {
      ...rest,
      date: date ? new Date(date) : undefined,
    });
  }

  @Delete(':id')
  @Roles(SystemRole.APROVA, SystemRole.ADMIN)
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.deleteMilestone.execute(projectId, id);
  }
}
