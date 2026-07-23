import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListWbsUseCase } from '../application/list-wbs.use-case';
import { CreateWbsNodeUseCase } from '../application/create-wbs-node.use-case';
import { UpdateWbsNodeUseCase } from '../application/update-wbs-node.use-case';
import { DeleteWbsNodeUseCase } from '../application/delete-wbs-node.use-case';
import { CreateWbsNodeDto } from './dto/create-wbs-node.dto';
import { UpdateWbsNodeDto } from './dto/update-wbs-node.dto';
import { toWbsNodeDto } from './wbs-node.mapper';

@Controller('projects/:projectId/wbs')
@UseGuards(RolesGuard)
export class WbsController {
  constructor(
    private listWbs: ListWbsUseCase,
    private createNode: CreateWbsNodeUseCase,
    private updateNode: UpdateWbsNodeUseCase,
    private deleteNode: DeleteWbsNodeUseCase,
  ) {}

  @Get()
  async list(@Param('projectId') projectId: string) {
    const nodes = await this.listWbs.execute(projectId);
    return nodes.map(toWbsNodeDto);
  }

  @Post()
  @Roles(SystemRole.PADRAO)
  async create(@Param('projectId') projectId: string, @Body() dto: CreateWbsNodeDto) {
    const node = await this.createNode.execute({ ...dto, projectId });
    return toWbsNodeDto(node);
  }

  @Patch(':id')
  @Roles(SystemRole.PADRAO)
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWbsNodeDto,
  ) {
    const node = await this.updateNode.execute(projectId, id, dto);
    return toWbsNodeDto(node);
  }

  @Delete(':id')
  @Roles(SystemRole.PADRAO)
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.deleteNode.execute(projectId, id);
  }
}
