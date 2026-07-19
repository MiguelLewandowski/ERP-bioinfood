import { Injectable, Inject } from '@nestjs/common';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class RemoveDependencyUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  // Idempotente por design: a UI do Gantt pode disparar a exclusão de um link
  // que nunca chegou a ser persistido (ex.: id efêmero de uma criação ainda em
  // voo). Nesses casos o objetivo do usuário — o vínculo não existir — já
  // está satisfeito, então não há erro a reportar.
  async execute(projectId: string, depId: string) {
    await this.repo.removeDependency(projectId, depId);
  }
}
