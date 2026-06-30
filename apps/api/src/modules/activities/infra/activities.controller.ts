import { Controller, Get, Query } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ListActivitiesUseCase } from '../application/list-activities.use-case';

@Controller('activities')
export class ActivitiesController {
  constructor(private listActivities: ListActivitiesUseCase) {}

  @Get()
  list(
    @CurrentUser() user: { id: string; role: SystemRole },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.listActivities.execute({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      requester: { id: user.id, role: user.role },
    });
  }
}
