import { Injectable, Inject } from '@nestjs/common';
import { IWbsRepository, WBS_REPOSITORY } from '../domain/wbs.repository.interface';

@Injectable()
export class ListWbsUseCase {
  constructor(@Inject(WBS_REPOSITORY) private repo: IWbsRepository) {}

  execute(projectId: string) {
    return this.repo.findAllByProject(projectId);
  }
}
