import { Injectable, Inject } from '@nestjs/common';
import { ICharterRepository, CHARTER_REPOSITORY } from '../domain/charter.repository.interface';
import { CharterWithMeta, UpsertCharterData } from '../domain/charter.entity';

@Injectable()
export class UpsertCharterUseCase {
  constructor(@Inject(CHARTER_REPOSITORY) private repo: ICharterRepository) {}

  async execute(projectId: string, data: UpsertCharterData): Promise<CharterWithMeta> {
    const charter = await this.repo.upsert(projectId, data);
    const lastEdit = await this.repo.findLastEdit(charter.id);
    return {
      ...charter,
      lastEditedBy: lastEdit?.actor ?? null,
      lastEditedAt: lastEdit?.at ?? null,
    };
  }
}
