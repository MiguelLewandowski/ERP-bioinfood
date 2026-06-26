import { Injectable, Inject } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';
import { TaskFilters } from '../../domain/task.entity';

@Injectable()
export class ListTasksUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  execute(projectId: string, filters: TaskFilters) {
    return this.repo.findAllByProject(projectId, filters);
  }
}
