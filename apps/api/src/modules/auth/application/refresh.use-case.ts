import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { IAuthRepository, AUTH_REPOSITORY } from '../domain/auth.repository';
import { ITokenService, TOKEN_SERVICE } from '../domain/token.service';
import { TokenPair } from '../domain/auth.types';

@Injectable()
export class RefreshUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private authRepo: IAuthRepository,
    @Inject(TOKEN_SERVICE) private tokenService: ITokenService,
  ) {}

  async execute(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.tokenService.verifyRefresh(refreshToken);

    if (!payload.jti) throw new UnauthorizedException('Token inválido');

    const stored = await this.authRepo.findRefreshToken(payload.jti);
    if (!stored || stored.revokedAt !== null) {
      throw new UnauthorizedException('Token revogado ou inválido');
    }

    await this.authRepo.revokeRefreshToken(payload.jti);

    const { accessToken, refreshToken: newRefreshToken, jti, expiresAt } =
      this.tokenService.generatePair({ sub: payload.sub, email: payload.email, role: payload.role });

    await this.authRepo.saveRefreshToken({ userId: payload.sub, jti, expiresAt });

    return { accessToken, refreshToken: newRefreshToken };
  }
}
