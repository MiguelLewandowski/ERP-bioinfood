import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SystemRole, TaskStatus } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListTasksUseCase } from '../application/use-cases/list-tasks.use-case';
import { CreateTaskUseCase } from '../application/use-cases/create-task.use-case';
import { GetTaskUseCase } from '../application/use-cases/get-task.use-case';
import { UpdateTaskUseCase } from '../application/use-cases/update-task.use-case';
import { DeleteTaskUseCase } from '../application/use-cases/delete-task.use-case';
import { ReorderTasksUseCase } from '../application/use-cases/reorder-tasks.use-case';
import { AddDependencyUseCase } from '../application/use-cases/add-dependency.use-case';
import { RemoveDependencyUseCase } from '../application/use-cases/remove-dependency.use-case';
import { AddChecklistItemUseCase } from '../application/use-cases/add-checklist-item.use-case';
import { UpdateChecklistItemUseCase } from '../application/use-cases/update-checklist-item.use-case';
import { DeleteChecklistItemUseCase } from '../application/use-cases/delete-checklist-item.use-case';
import { AddPopUsageUseCase } from '../application/use-cases/add-pop-usage.use-case';
import { RemovePopUsageUseCase } from '../application/use-cases/remove-pop-usage.use-case';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { AddDependencyDto } from './dto/add-dependency.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { AddPopUsageDto } from './dto/add-pop-usage.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { toTaskDto } from './task.mapper';

@Controller('projects/:projectId/tasks')
@UseGuards(RolesGuard)
export class TasksController {
  constructor(
    private listTasks: ListTasksUseCase,
    private createTask: CreateTaskUseCase,
    private getTask: GetTaskUseCase,
    private updateTask: UpdateTaskUseCase,
    private deleteTask: DeleteTaskUseCase,
    private reorderTasks: ReorderTasksUseCase,
    private addDependency: AddDependencyUseCase,
    private removeDependency: RemoveDependencyUseCase,
    private addChecklistItem: AddChecklistItemUseCase,
    private updateChecklistItem: UpdateChecklistItemUseCase,
    private deleteChecklistItem: DeleteChecklistItemUseCase,
    private addPopUsage: AddPopUsageUseCase,
    private removePopUsage: RemovePopUsageUseCase,
  ) {}

  @Get()
  async list(
    @Param('projectId') projectId: string,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('wbsNodeId') wbsNodeId?: string,
  ) {
    const tasks = await this.listTasks.execute(projectId, { status, assigneeId, wbsNodeId });
    return tasks.map(toTaskDto);
  }

  @Post()
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async create(@Param('projectId') projectId: string, @Body() dto: CreateTaskDto) {
    const task = await this.createTask.execute({
      ...dto,
      projectId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
    return toTaskDto(task);
  }

  @Patch('reorder')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  reorder(@Param('projectId') projectId: string, @Body() dto: ReorderTasksDto) {
    return this.reorderTasks.execute(projectId, dto.items);
  }

  @Get(':id')
  async get(@Param('projectId') projectId: string, @Param('id') id: string) {
    const task = await this.getTask.execute(projectId, id);
    return toTaskDto(task);
  }

  @Patch(':id')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const { startDate, dueDate, ...rest } = dto;
    const task = await this.updateTask.execute(projectId, id, {
      ...rest,
      startDate: startDate === null ? null : startDate ? new Date(startDate) : undefined,
      dueDate: dueDate === null ? null : dueDate ? new Date(dueDate) : undefined,
    });
    return toTaskDto(task);
  }

  @Delete(':id')
  @Roles(SystemRole.APROVA, SystemRole.ADMIN)
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.deleteTask.execute(projectId, id);
  }

  // ── Dependencies ─────────────────────────────────────────────────────────────

  @Post(':id/dependencies')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  addDep(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: AddDependencyDto,
  ) {
    return this.addDependency.execute(projectId, id, dto.predecessorId, dto.type, dto.lag);
  }

  @Delete(':id/dependencies/:depId')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  removeDep(@Param('projectId') projectId: string, @Param('depId') depId: string) {
    return this.removeDependency.execute(projectId, depId);
  }

  // ── Checklist ────────────────────────────────────────────────────────────────

  @Post(':id/checklist')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  addChecklist(
    @Param('projectId') projectId: string,
    @Param('id') taskId: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.addChecklistItem.execute(projectId, taskId, dto.text);
  }

  @Patch(':id/checklist/:itemId')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  updateChecklist(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.updateChecklistItem.execute(projectId, itemId, dto);
  }

  @Delete(':id/checklist/:itemId')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  deleteChecklist(@Param('projectId') projectId: string, @Param('itemId') itemId: string) {
    return this.deleteChecklistItem.execute(projectId, itemId);
  }

  // ── POPs utilizadas ─────────────────────────────────────────────────────────

  @Post(':id/pops')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  addPop(
    @Param('projectId') projectId: string,
    @Param('id') taskId: string,
    @Body() dto: AddPopUsageDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.addPopUsage.execute(projectId, taskId, dto.popVersionId, user.id);
  }

  @Delete(':id/pops/:linkId')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  removePop(@Param('projectId') projectId: string, @Param('linkId') linkId: string) {
    return this.removePopUsage.execute(projectId, linkId);
  }
}
