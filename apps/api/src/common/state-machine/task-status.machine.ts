import { BadRequestException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';

const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  TODO:        [TaskStatus.IN_PROGRESS],
  IN_PROGRESS: [TaskStatus.DONE, TaskStatus.TODO],
  DONE:        [TaskStatus.IN_PROGRESS],
};

export function assertTaskStatusTransition(from: TaskStatus, to: TaskStatus): void {
  if (from === to) return;
  if (!ALLOWED[from].includes(to)) {
    throw new BadRequestException(
      `Transição de status inválida: ${from} → ${to}`,
    );
  }
}
