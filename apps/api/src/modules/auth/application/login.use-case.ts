import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IAuthRepository, AUTH_REPOSITORY } from '../domain/auth.repository';
import { ITokenService, TOKEN_SERVICE } from '../domain/token.service';
import { TokenPair } from '../domain/auth.types';

export interface LoginResult {
  tokens: TokenPair;
  user: { id: string; name: string; email: string; role: string; mustChangePassword: boolean };
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private authRepo: IAuthRepository,
    @Inject(TOKEN_SERVICE) private tokenService: ITokenService,
  ) {}

  async execute(email: string, password: string): Promise<LoginResult> {
    const user = await this.authRepo.findByEmail(email);
    if (!user || !user.isActive) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const { accessToken, refreshToken, jti, expiresAt } = this.tokenService.generatePair({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.authRepo.saveRefreshToken({ userId: user.id, jti, expiresAt });

    return {
      tokens: { accessToken, refreshToken },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }
}
