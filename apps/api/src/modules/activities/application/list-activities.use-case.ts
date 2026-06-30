import { Injectable, Inject } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import {
  IActivitiesRepository,
  ACTIVITIES_REPOSITORY,
} from '../domain/activities.repository.interface';
import { ActivityListItem, ActivityRequester } from '../domain/activity.entity';

interface ListActivitiesInput {
  from?: Date;
  to?: Date;
  requester: ActivityRequester;
}

@Injectable()
export class ListActivitiesUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private repo: IActivitiesRepository,
  ) {}

  async execute({ from, to, requester }: ListActivitiesInput): Promise<ActivityListItem[]> {
    // CLIENTE só enxerga atividades de projetos liberados via ProjectAccess.
    // Esta rota não tem :projectId, então o ProjectAccessGuard não atua aqui —
    // o filtro precisa ser feito manualmente.
    if (requester.role === SystemRole.CLIENTE) {
      const projectIds = await this.repo.findAccessibleProjectIds(requester.id);
      if (projectIds.length === 0) return [];
      return this.repo.findAllInRange({ from, to, projectIds });
    }

    return this.repo.findAllInRange({ from, to });
  }
}
