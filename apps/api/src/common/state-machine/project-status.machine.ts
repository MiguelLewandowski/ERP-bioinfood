import { BadRequestException } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';

const ALLOWED: Record<ProjectStatus, ProjectStatus[]> = {
  PLANNING:    [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
  IN_PROGRESS: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  ON_HOLD:     [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
  COMPLETED:   [],
  CANCELLED:   [],
};

export function assertProjectStatusTransition(from: ProjectStatus, to: ProjectStatus): void {
  if (from === to) return;
  if (!ALLOWED[from].includes(to)) {
    throw new BadRequestException(
      `Transição de status inválida: ${from} → ${to}`,
    );
  }
}
