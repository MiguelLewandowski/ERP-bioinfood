import { Controller, Get, Put, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GetCharterUseCase } from '../application/get-charter.use-case';
import { UpsertCharterUseCase } from '../application/upsert-charter.use-case';
import { ApproveCharterUseCase } from '../application/approve-charter.use-case';
import { UpsertCharterDto } from './dto/upsert-charter.dto';

@Controller('projects/:projectId/charter')
@UseGuards(RolesGuard)
export class CharterController {
  constructor(
    private getCharter: GetCharterUseCase,
    private upsertCharter: UpsertCharterUseCase,
    private approveCharter: ApproveCharterUseCase,
  ) {}

  @Get()
  get(@Param('projectId') projectId: string) {
    return this.getCharter.execute(projectId);
  }

  @Put()
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  upsert(@Param('projectId') projectId: string, @Body() dto: UpsertCharterDto) {
    return this.upsertCharter.execute(projectId, dto);
  }

  @Post('approve')
  @Roles(SystemRole.APROVA, SystemRole.ADMIN)
  approve(@Param('projectId') projectId: string, @CurrentUser() user: { id: string }) {
    return this.approveCharter.execute(projectId, user.id);
  }
}
