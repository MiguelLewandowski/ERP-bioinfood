import { Controller, Post, Body, Get, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthLoginResponseDto, AuthRefreshResponseDto } from '@bioinfood/shared';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { LoginUseCase } from '../application/login.use-case';
import { RefreshUseCase } from '../application/refresh.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { MeUseCase } from '../application/me.use-case';
import { ChangePasswordUseCase } from '../application/change-password.use-case';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthUser } from '../domain/auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private loginUseCase: LoginUseCase,
    private refreshUseCase: RefreshUseCase,
    private logoutUseCase: LogoutUseCase,
    private meUseCase: MeUseCase,
    private changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  // Limite agressivo contra brute-force de senha: 5 tentativas/min por IP.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthLoginResponseDto> {
    return this.loginUseCase.execute(dto.email, dto.password);
  }

  // O tipo de retorno é o contrato compartilhado de propósito: o BFF lê esta
  // resposta por `AuthRefreshResponseDto`, então mudar o shape aqui sem mudar lá
  // passa a quebrar o build em vez de derrubar a sessão em produção.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto): Promise<AuthRefreshResponseDto> {
    return this.refreshUseCase.execute(dto.refreshToken);
  }

  // Público de propósito: sair precisa funcionar com o access token já expirado.
  // A autorização vem da posse do refresh token, que é verificado no use-case.
  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.logoutUseCase.execute(dto.refreshToken, dto.allDevices ?? false);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.meUseCase.execute(user.id);
  }

  // Exige a senha atual — limita brute-force da senha atual via troca.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('change-password')
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.changePasswordUseCase.execute(user.id, dto.currentPassword, dto.newPassword);
  }
}
