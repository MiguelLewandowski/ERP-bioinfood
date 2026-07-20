import { Injectable, Inject } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class RemovePopUsageUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  // Idempotente por design — mesmo espírito de RemoveDependencyUseCase.
  async execute(projectId: string, id: string) {
    await this.repo.removePopUsage(projectId, id);
  }
}
