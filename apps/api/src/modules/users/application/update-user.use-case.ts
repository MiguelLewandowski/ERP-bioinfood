import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../domain/user.repository';
import { UpdateUserData, UserView } from '../domain/user.entity';

@Injectable()
export class UpdateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private repo: IUserRepository) {}

  async execute(id: string, data: UpdateUserData): Promise<UserView> {
    const exists = await this.repo.findById(id);
    if (!exists) throw new NotFoundException('Usuário não encontrado');
    return this.repo.update(id, data);
  }
}
