import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';
import { UpdateTaskData } from '../../domain/task.entity';
import { assertTaskStatusTransition } from '../../../../common/state-machine/task-status.machine';

@Injectable()
export class UpdateTaskUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  async execute(projectId: string, id: string, data: UpdateTaskData) {
    const task = await this.repo.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    if (task.projectId !== projectId) throw new ForbiddenException('Task não pertence a este projeto');

    if (data.status && data.status !== task.status) {
      assertTaskStatusTransition(task.status, data.status);
    }

    return this.repo.update(id, data);
  }
}
