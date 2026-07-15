import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { IAuthRepository, AUTH_REPOSITORY } from '../domain/auth.repository';

export interface MeResult {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

@Injectable()
export class MeUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private authRepo: IAuthRepository) {}

  async execute(userId: string): Promise<MeResult> {
    const user = await this.authRepo.findById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException('Usuário inativo');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
