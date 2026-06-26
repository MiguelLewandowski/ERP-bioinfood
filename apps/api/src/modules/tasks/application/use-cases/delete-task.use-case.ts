import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class DeleteTaskUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  async execute(projectId: string, id: string) {
    const task = await this.repo.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    if (task.projectId !== projectId) throw new ForbiddenException('Task não pertence a este projeto');
    await this.repo.softDelete(id);
  }
}
