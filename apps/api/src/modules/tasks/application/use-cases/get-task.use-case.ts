import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class GetTaskUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  async execute(id: string) {
    const task = await this.repo.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
