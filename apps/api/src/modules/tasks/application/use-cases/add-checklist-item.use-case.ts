import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class AddChecklistItemUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  async execute(projectId: string, taskId: string, text: string) {
    const task = await this.repo.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');
    if (task.projectId !== projectId) throw new ForbiddenException('Task não pertence a este projeto');
    const order = task.checklist.length;
    return this.repo.addChecklistItem(taskId, text, order);
  }
}
