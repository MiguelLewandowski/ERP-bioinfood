import { BadRequestException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';

// TODO → DONE é permitido de propósito. A regra anterior obrigava passar por
// IN_PROGRESS, e isso não descrevia o trabalho real: tarefa curta é concluída
// sem nunca ter sido formalmente iniciada, e quem usava o sistema batia na
// mensagem "Transição de status inválida" tentando arrastar no kanban ou salvar
// pelo formulário. Regra que só o sistema entende vira defeito para quem usa.
//
// As datas reais continuam corretas: `UpdateTaskUseCase` preenche `actualStart`
// junto de `actualEnd` quando a tarefa vai para DONE sem ter começado.
const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  TODO:        [TaskStatus.IN_PROGRESS, TaskStatus.DONE],
  IN_PROGRESS: [TaskStatus.DONE, TaskStatus.TODO],
  DONE:        [TaskStatus.IN_PROGRESS, TaskStatus.TODO],
};

export function assertTaskStatusTransition(from: TaskStatus, to: TaskStatus): void {
  if (from === to) return;
  if (!ALLOWED[from].includes(to)) {
    throw new BadRequestException(
      `Transição de status inválida: ${from} → ${to}`,
    );
  }
}
