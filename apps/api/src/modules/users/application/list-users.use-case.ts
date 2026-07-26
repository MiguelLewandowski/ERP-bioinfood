import { Injectable, Inject } from '@nestjs/common';
import type { PaginatedResult } from '@bioinfood/shared';
import { IUserRepository, USER_REPOSITORY } from '../domain/user.repository';
import { UserView } from '../domain/user.entity';

const MAX_LIMIT = 100;

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private repo: IUserRepository) {}

  async execute(page = 1, limit = 20): Promise<PaginatedResult<UserView>> {
    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit) && limit >= 1 ? Math.min(Math.floor(limit), MAX_LIMIT) : 20;
    const { items, total } = await this.repo.findAll(safePage, safeLimit);
    return { items, total, page: safePage, limit: safeLimit };
  }
}
