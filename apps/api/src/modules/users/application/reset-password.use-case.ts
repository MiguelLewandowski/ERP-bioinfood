import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUserRepository, USER_REPOSITORY } from '../domain/user.repository';
import { UserView } from '../domain/user.entity';

@Injectable()
export class ResetPasswordUseCase {
  constructor(@Inject(USER_REPOSITORY) private repo: IUserRepository) {}

  async execute(id: string, newPassword: string): Promise<UserView> {
    const exists = await this.repo.findById(id);
    if (!exists) throw new NotFoundException('Usuário não encontrado');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await this.repo.resetPassword(id, passwordHash);
    await this.repo.revokeAllRefreshTokens(id);
    return updated;
  }
}
