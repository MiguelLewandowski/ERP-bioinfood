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
  list(@Param('projectId') projectId: string) {
    return this.listWbs.execute(projectId);
  }

  @Post()
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  create(@Param('projectId') projectId: string, @Body() dto: CreateWbsNodeDto) {
    return this.createNode.execute({ ...dto, projectId });
  }

  @Patch(':id')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWbsNodeDto,
  ) {
    return this.updateNode.execute(projectId, id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.APROVA, SystemRole.ADMIN)
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.deleteNode.execute(projectId, id);
  }
}
