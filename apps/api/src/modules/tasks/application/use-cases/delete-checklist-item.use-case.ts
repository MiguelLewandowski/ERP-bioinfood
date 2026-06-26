import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class DeleteChecklistItemUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  async execute(itemId: string) {
    const item = await this.repo.findChecklistItem(itemId);
    if (!item) throw new NotFoundException('Checklist item not found');
    await this.repo.deleteChecklistItem(itemId);
  }
}
