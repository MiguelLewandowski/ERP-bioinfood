import { Injectable, Inject } from '@nestjs/common';
import { IProjectRepository, PROJECT_REPOSITORY } from '../domain/project.repository';

@Injectable()
export class RevokeAccessUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private repo: IProjectRepository) {}

  async execute(projectId: string, userId: string): Promise<void> {
    return this.repo.revokeAccess(projectId, userId);
  }
}
