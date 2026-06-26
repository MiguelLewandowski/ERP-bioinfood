import { Injectable, Inject } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class ReorderTasksUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  execute(items: Array<{ id: string; order: number }>) {
    return this.repo.reorder(items);
  }
}
