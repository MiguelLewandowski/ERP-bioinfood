import { Injectable, Inject } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';
import { CreateTaskData } from '../../domain/task.entity';

@Injectable()
export class CreateTaskUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  execute(data: CreateTaskData) {
    return this.repo.create(data);
  }
}
