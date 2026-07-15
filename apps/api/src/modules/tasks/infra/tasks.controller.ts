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
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { AddDependencyDto } from './dto/add-dependency.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

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
  ) {}

  @Get()
  list(
    @Param('projectId') projectId: string,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('wbsNodeId') wbsNodeId?: string,
  ) {
    return this.listTasks.execute(projectId, { status, assigneeId, wbsNodeId });
  }

  @Post()
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  create(@Param('projectId') projectId: string, @Body() dto: CreateTaskDto) {
    return this.createTask.execute({
      ...dto,
      projectId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
  }

  @Patch('reorder')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  reorder(@Body() dto: ReorderTasksDto) {
    return this.reorderTasks.execute(dto.items);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getTask.execute(id);
  }

  @Patch(':id')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const { startDate, dueDate, ...rest } = dto;
    return this.updateTask.execute(projectId, id, {
      ...rest,
      startDate: startDate === null ? null : startDate ? new Date(startDate) : undefined,
      dueDate: dueDate === null ? null : dueDate ? new Date(dueDate) : undefined,
    });
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
  removeDep(@Param('depId') depId: string) {
    return this.removeDependency.execute(depId);
  }

  // ── Checklist ────────────────────────────────────────────────────────────────

  @Post(':id/checklist')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  addChecklist(@Param('id') taskId: string, @Body() dto: CreateChecklistItemDto) {
    return this.addChecklistItem.execute(taskId, dto.text);
  }

  @Patch(':id/checklist/:itemId')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  updateChecklist(@Param('itemId') itemId: string, @Body() dto: UpdateChecklistItemDto) {
    return this.updateChecklistItem.execute(itemId, dto);
  }

  @Delete(':id/checklist/:itemId')
  @Roles(SystemRole.INSERE, SystemRole.APROVA, SystemRole.ADMIN)
  deleteChecklist(@Param('itemId') itemId: string) {
    return this.deleteChecklistItem.execute(itemId);
  }
}
