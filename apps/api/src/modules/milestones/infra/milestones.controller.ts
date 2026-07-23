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
import { toMilestoneDto } from './milestone.mapper';

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
  async list(@Param('projectId') projectId: string) {
    const milestones = await this.listMilestones.execute(projectId);
    return milestones.map(toMilestoneDto);
  }

  @Post()
  @Roles(SystemRole.PADRAO)
  async create(@Param('projectId') projectId: string, @Body() dto: CreateMilestoneDto) {
    const milestone = await this.createMilestone.execute({
      ...dto,
      projectId,
      date: new Date(dto.date),
    });
    return toMilestoneDto(milestone);
  }

  @Patch(':id')
  @Roles(SystemRole.PADRAO)
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    const { date, ...rest } = dto;
    const milestone = await this.updateMilestone.execute(projectId, id, {
      ...rest,
      date: date ? new Date(date) : undefined,
    });
    return toMilestoneDto(milestone);
  }

  @Delete(':id')
  @Roles(SystemRole.PADRAO)
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.deleteMilestone.execute(projectId, id);
  }
}
