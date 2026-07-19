import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class UpdateChecklistItemUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  async execute(projectId: string, itemId: string, data: { text?: string; checked?: boolean }) {
    const item = await this.repo.findChecklistItem(projectId, itemId);
    if (!item) throw new NotFoundException('Checklist item not found');
    return this.repo.updateChecklistItem(projectId, itemId, data);
  }
}
