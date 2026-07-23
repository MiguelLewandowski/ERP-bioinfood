import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ListInteractionsUseCase } from '../application/list-interactions.use-case';
import { CreateInteractionUseCase } from '../application/create-interaction.use-case';
import { UpdateInteractionUseCase } from '../application/update-interaction.use-case';
import { DeleteInteractionUseCase } from '../application/delete-interaction.use-case';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { UpdateInteractionDto } from './dto/update-interaction.dto';
import { toInteractionDto } from './interaction.mapper';

// Ler = todos os papéis internos; escrever = só ADMIN (decisão do owner, §5 do
// plano de CRM); update/delete ainda checam autor-ou-ADMIN no use-case.
@Controller('interactions')
@UseGuards(RolesGuard)
@Roles(SystemRole.PADRAO)
export class InteractionsController {
  constructor(
    private listInteractions: ListInteractionsUseCase,
    private createInteraction: CreateInteractionUseCase,
    private updateInteraction: UpdateInteractionUseCase,
    private deleteInteraction: DeleteInteractionUseCase,
  ) {}

  @Get()
  async list(
    @Query('orgId') orgId?: string,
    @Query('contactId') contactId?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    if (!orgId) throw new BadRequestException('orgId é obrigatório');
    const items = await this.listInteractions.execute(orgId, {
      contactId,
      type: type as never,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
    return items.map(toInteractionDto);
  }

  @Post()
  @Roles(SystemRole.ADMIN)
  async create(@Body() dto: CreateInteractionDto, @CurrentUser() user: { id: string }) {
    const interaction = await this.createInteraction.execute({
      ...dto,
      userId: user.id,
      interactionAt: dto.interactionAt ? new Date(dto.interactionAt) : undefined,
    });
    return toInteractionDto(interaction);
  }

  @Patch(':id')
  @Roles(SystemRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInteractionDto,
    @CurrentUser() user: { id: string; role: SystemRole },
  ) {
    const interaction = await this.updateInteraction.execute(
      id,
      { ...dto, interactionAt: dto.interactionAt ? new Date(dto.interactionAt) : undefined },
      user,
    );
    return toInteractionDto(interaction);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMIN)
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string; role: SystemRole }) {
    await this.deleteInteraction.execute(id, user);
  }
}
