import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class RemoveDependencyUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  async execute(depId: string) {
    const dep = await this.repo.findDependency(depId);
    if (!dep) throw new NotFoundException('Dependency not found');
    await this.repo.removeDependency(depId);
  }
}
