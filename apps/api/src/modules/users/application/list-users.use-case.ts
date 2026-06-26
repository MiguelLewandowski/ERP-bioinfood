import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../domain/user.repository';
import { UserView } from '../domain/user.entity';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private repo: IUserRepository) {}

  async execute(page = 1, limit = 20): Promise<{ users: UserView[]; total: number; page: number; limit: number }> {
    const { users, total } = await this.repo.findAll(page, limit);
    return { users, total, page, limit };
  }
}
