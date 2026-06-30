import {
  Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';
import { UpdateTaskData } from '../../domain/task.entity';
import { assertTaskStatusTransition } from '../../../../common/state-machine/task-status.machine';

// Status que significam "iniciar/avançar" a atividade — exigem antecessoras concluídas.
const REQUIRES_PREDECESSORS_DONE: TaskStatus[] = [TaskStatus.IN_PROGRESS, TaskStatus.DONE];

@Injectable()
export class UpdateTaskUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  async execute(projectId: string, id: string, data: UpdateTaskData) {
    const task = await this.repo.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    if (task.projectId !== projectId) throw new ForbiddenException('Task não pertence a este projeto');

    if (data.status && data.status !== task.status) {
      assertTaskStatusTransition(task.status, data.status);

      // Não permite começar/concluir enquanto houver antecessora pendente.
      if (REQUIRES_PREDECESSORS_DONE.includes(data.status)) {
        const pending = await this.repo.findIncompletePredecessors(id);
        if (pending.length > 0) {
          const titles = pending.map((p) => p.title).join(', ');
          throw new BadRequestException(
            `Não é possível avançar esta atividade: a(s) antecessora(s) ainda não foram concluídas (${titles}).`,
          );
        }
      }

      // Datas reais de execução (PMBOK): registra início/fim ao mudar de status.
      const now = new Date();
      if (data.status === TaskStatus.IN_PROGRESS && !task.actualStart) {
        data.actualStart = now;
      }
      if (data.status === TaskStatus.DONE) {
        if (!task.actualStart) data.actualStart = now;
        if (!task.actualEnd) data.actualEnd = now;
      }
    }

    return this.repo.update(id, data);
  }
}
