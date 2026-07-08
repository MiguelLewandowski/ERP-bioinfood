import { Injectable, Inject } from '@nestjs/common';
import { ICharterRepository, CHARTER_REPOSITORY } from '../domain/charter.repository.interface';
import { CharterWithMeta } from '../domain/charter.entity';

@Injectable()
export class GetCharterUseCase {
  constructor(@Inject(CHARTER_REPOSITORY) private repo: ICharterRepository) {}

  async execute(projectId: string): Promise<CharterWithMeta | null> {
    const charter = await this.repo.findByProject(projectId);
    if (!charter) return null;
    const lastEdit = await this.repo.findLastEdit(charter.id);
    return {
      ...charter,
      lastEditedBy: lastEdit?.actor ?? null,
      lastEditedAt: lastEdit?.at ?? null,
    };
  }
}
