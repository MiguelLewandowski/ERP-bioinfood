import { Controller, Get, Put, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GetCharterUseCase } from '../application/get-charter.use-case';
import { UpsertCharterUseCase } from '../application/upsert-charter.use-case';
import { ApproveCharterUseCase } from '../application/approve-charter.use-case';
import { UpsertCharterDto } from './dto/upsert-charter.dto';
import { toCharterDto } from './charter.mapper';

@Controller('projects/:projectId/charter')
@UseGuards(RolesGuard)
export class CharterController {
  constructor(
    private getCharter: GetCharterUseCase,
    private upsertCharter: UpsertCharterUseCase,
    private approveCharter: ApproveCharterUseCase,
  ) {}

  @Get()
  async get(@Param('projectId') projectId: string) {
    const charter = await this.getCharter.execute(projectId);
    return charter ? toCharterDto(charter) : null;
  }

  @Put()
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async upsert(@Param('projectId') projectId: string, @Body() dto: UpsertCharterDto) {
    const charter = await this.upsertCharter.execute(projectId, dto);
    return toCharterDto(charter);
  }

  @Post('approve')
  @Roles(SystemRole.APROVA, SystemRole.ADMIN)
  async approve(@Param('projectId') projectId: string, @CurrentUser() user: { id: string }) {
    const charter = await this.approveCharter.execute(projectId, user.id);
    return toCharterDto(charter);
  }
}
