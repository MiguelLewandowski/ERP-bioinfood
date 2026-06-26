import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class AddChecklistItemUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  async execute(taskId: string, text: string) {
    const task = await this.repo.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');
    const order = task.checklist.length;
    return this.repo.addChecklistItem(taskId, text, order);
  }
}
