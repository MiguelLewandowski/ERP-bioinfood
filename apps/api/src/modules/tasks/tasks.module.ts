import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TASK_REPOSITORY } from './domain/tasks.repository.interface';
import { TasksPrismaRepository } from './infra/tasks.prisma.repository';
import { TasksController } from './infra/tasks.controller';
import { ListTasksUseCase } from './application/use-cases/list-tasks.use-case';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { GetTaskUseCase } from './application/use-cases/get-task.use-case';
import { UpdateTaskUseCase } from './application/use-cases/update-task.use-case';
import { DeleteTaskUseCase } from './application/use-cases/delete-task.use-case';
import { ReorderTasksUseCase } from './application/use-cases/reorder-tasks.use-case';
import { AddDependencyUseCase } from './application/use-cases/add-dependency.use-case';
import { RemoveDependencyUseCase } from './application/use-cases/remove-dependency.use-case';
import { AddChecklistItemUseCase } from './application/use-cases/add-checklist-item.use-case';
import { UpdateChecklistItemUseCase } from './application/use-cases/update-checklist-item.use-case';
import { DeleteChecklistItemUseCase } from './application/use-cases/delete-checklist-item.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [
    { provide: TASK_REPOSITORY, useClass: TasksPrismaRepository },
    ListTasksUseCase,
    CreateTaskUseCase,
    GetTaskUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
    ReorderTasksUseCase,
    AddDependencyUseCase,
    RemoveDependencyUseCase,
    AddChecklistItemUseCase,
    UpdateChecklistItemUseCase,
    DeleteChecklistItemUseCase,
  ],
})
export class TasksModule {}
