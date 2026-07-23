import { Injectable, Inject, Logger } from '@nestjs/common';
import { IAuthRepository, AUTH_REPOSITORY } from '../domain/auth.repository';
import { ITokenService, TOKEN_SERVICE } from '../domain/token.service';

@Injectable()
export class LogoutUseCase {
  private readonly logger = new Logger(LogoutUseCase.name);

  constructor(
    @Inject(AUTH_REPOSITORY) private authRepo: IAuthRepository,
    @Inject(TOKEN_SERVICE) private tokenService: ITokenService,
  ) {}

  /**
   * Revoga o refresh token da sessão que está saindo.
   *
   * Nunca lança: sair tem que funcionar mesmo com token corrompido, expirado ou
   * já revogado — o cliente apaga os cookies de qualquer forma, e um erro aqui
   * só deixaria o usuário preso numa sessão que ele quer encerrar.
   */
  async execute(refreshToken: string | undefined, allDevices = false): Promise<void> {
    if (!refreshToken) return;

    try {
      const payload = this.tokenService.verifyRefresh(refreshToken);
      if (allDevices) {
        await this.authRepo.revokeAllForUser(payload.sub);
      } else if (payload.jti) {
        await this.authRepo.revokeRefreshToken(payload.jti);
      }
    } catch (err) {
      this.logger.warn('Logout com refresh token inválido — cookies limpos mesmo assim', err as Error);
    }
  }
}
