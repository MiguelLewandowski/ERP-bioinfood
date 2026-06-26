import { Injectable, Inject } from '@nestjs/common';
import { ICharterRepository, CHARTER_REPOSITORY } from '../domain/charter.repository.interface';

@Injectable()
export class GetCharterUseCase {
  constructor(@Inject(CHARTER_REPOSITORY) private repo: ICharterRepository) {}

  execute(projectId: string) {
    return this.repo.findByProject(projectId);
  }
}
