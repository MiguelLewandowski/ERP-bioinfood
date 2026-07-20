import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
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

    // Anti-IDOR: a versão da POP precisa pertencer ao mesmo projeto da task
    // da URL — sem isto, seria possível vincular POP de outro projeto.
    const versionRef = await this.popRepo.findVersionProjectRef(popVersionId);
    if (!versionRef) throw new NotFoundException('Versão de POP não encontrada');
    if (versionRef.projectId !== projectId) throw new ForbiddenException('POP não pertence a este projeto');

    return this.taskRepo.addPopUsage(taskId, popVersionId, addedById);
  }
}
