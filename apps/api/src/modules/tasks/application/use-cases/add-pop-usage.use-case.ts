import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';
import { IPopRepository, POP_REPOSITORY } from '../../../pops/domain/pops.repository.interface';

@Injectable()
export class AddPopUsageUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private taskRepo: ITaskRepository,
    @Inject(POP_REPOSITORY) private popRepo: IPopRepository,
  ) {}

  async execute(projectId: string, taskId: string, popVersionId: string, addedById: string) {
    const task = await this.taskRepo.findById(taskId);
    if (!task || task.projectId !== projectId) throw new NotFoundException('Task not found');

    // POP é catálogo global (sem projeto) — só confirma que a versão existe
    // e não é de uma POP soft-deletada.
    const versionRef = await this.popRepo.findVersionRef(popVersionId);
    if (!versionRef) throw new NotFoundException('Versão de POP não encontrada');

    return this.taskRepo.addPopUsage(taskId, popVersionId, addedById);
  }
}
