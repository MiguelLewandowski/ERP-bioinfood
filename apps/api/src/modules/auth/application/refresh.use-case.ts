import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { IAuthRepository, AUTH_REPOSITORY } from '../domain/auth.repository';
import { ITokenService, TOKEN_SERVICE } from '../domain/token.service';
import { TokenPair } from '../domain/auth.types';

@Injectable()
export class RefreshUseCase {
  private readonly logger = new Logger(RefreshUseCase.name);

  constructor(
    @Inject(AUTH_REPOSITORY) private authRepo: IAuthRepository,
    @Inject(TOKEN_SERVICE) private tokenService: ITokenService,
  ) {}

  async execute(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.tokenService.verifyRefresh(refreshToken);

    if (!payload.jti) throw new UnauthorizedException('Token inválido');

    const stored = await this.authRepo.findRefreshToken(payload.jti);
    if (!stored) throw new UnauthorizedException('Token revogado ou inválido');

    // DETECÇÃO DE REUSO: o refresh é de uso único e é revogado ao ser trocado.
    // Reaparecer revogado significa que existem duas cópias em circulação — ou
    // seja, alguém copiou o token. Não dá para saber qual das partes é a
    // legítima, então derruba TODAS as sessões do usuário e obriga login novo.
    if (stored.revokedAt !== null) {
      const killed = await this.authRepo.revokeAllForUser(payload.sub);
      this.logger.warn(
        `Reuso de refresh token detectado (user=${payload.sub}, jti=${payload.jti}). ` +
        `${killed} sessão(ões) revogada(s).`,
      );
      throw new UnauthorizedException('Sessão encerrada por segurança. Entre novamente.');
    }

    const user = await this.authRepo.findById(payload.sub);
    if (!user || !user.isActive) {
      await this.authRepo.revokeRefreshToken(payload.jti);
      throw new UnauthorizedException('Usuário inativo');
    }

    await this.authRepo.revokeRefreshToken(payload.jti);

    const { accessToken, refreshToken: newRefreshToken, jti, expiresAt } =
      this.tokenService.generatePair({ sub: user.id, email: user.email, role: user.role });

    await this.authRepo.saveRefreshToken({ userId: payload.sub, jti, expiresAt });

    return { accessToken, refreshToken: newRefreshToken };
  }
}
