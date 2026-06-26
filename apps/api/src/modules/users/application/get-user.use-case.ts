import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../domain/user.repository';
import { UserView } from '../domain/user.entity';

@Injectable()
export class GetUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private repo: IUserRepository) {}

  async execute(id: string): Promise<UserView> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
}
