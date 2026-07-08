import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityStatus } from '@prisma/client';
import { CRM_ACTIVITY_REPOSITORY, ICrmActivityRepository } from '../domain/crm-activity.repository';
import { UpdateCrmActivityData } from '../domain/crm-activity.entity';

@Injectable()
export class UpdateCrmActivityUseCase {
  constructor(
    @Inject(CRM_ACTIVITY_REPOSITORY) private repo: ICrmActivityRepository,
  ) {}

  async execute(id: string, data: UpdateCrmActivityData) {
    const current = await this.repo.findById(id);
    if (!current) throw new NotFoundException('Atividade não encontrada');

    // completedAt é automático: entra ao concluir (DONE), some ao reabrir.
    let completedAt: Date | null | undefined;
    if (data.status && data.status !== current.status) {
      completedAt = data.status === ActivityStatus.DONE ? new Date() : null;
    }

    return this.repo.update(id, { ...data, completedAt });
  }
}
