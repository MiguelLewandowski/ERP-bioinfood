import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class GetTaskUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  async execute(projectId: string, id: string) {
    const task = await this.repo.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    // Isolamento entre projetos: a task tem que pertencer ao :projectId da URL
    // (que o ProjectAccessGuard já autorizou). Sem isto, um CLIENTE com acesso
    // ao projeto A leria tasks do projeto B trocando o id. Ver analise-seguranca.md A1.
    if (task.projectId !== projectId) throw new ForbiddenException('Task não pertence a este projeto');
    return task;
  }
}
