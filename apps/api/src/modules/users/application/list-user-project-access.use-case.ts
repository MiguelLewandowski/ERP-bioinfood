import { Injectable, Inject } from '@nestjs/common';
import { IProjectRepository, PROJECT_REPOSITORY } from '../../projects/domain/project.repository';

export interface UserProjectAccessView {
  id: string;
  name: string;
  status: string;
}

@Injectable()
export class ListUserProjectAccessUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private projectRepo: IProjectRepository) {}

  async execute(userId: string): Promise<UserProjectAccessView[]> {
    const projects = await this.projectRepo.findAllByUserId(userId);
    return projects.map((p) => ({ id: p.id, name: p.name, status: p.status }));
  }
}
