import { Injectable, Inject } from '@nestjs/common';
import { ICharterRepository, CHARTER_REPOSITORY } from '../domain/charter.repository.interface';
import { UpsertCharterData } from '../domain/charter.entity';

@Injectable()
export class UpsertCharterUseCase {
  constructor(@Inject(CHARTER_REPOSITORY) private repo: ICharterRepository) {}

  execute(projectId: string, data: UpsertCharterData) {
    return this.repo.upsert(projectId, data);
  }
}
