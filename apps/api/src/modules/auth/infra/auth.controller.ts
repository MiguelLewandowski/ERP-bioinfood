import { Controller, Post, Body, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { LoginUseCase, LoginResult } from '../application/login.use-case';
import { RefreshUseCase } from '../application/refresh.use-case';
import { MeUseCase } from '../application/me.use-case';
import { ChangePasswordUseCase } from '../application/change-password.use-case';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthUser } from '../domain/auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private loginUseCase: LoginUseCase,
    private refreshUseCase: RefreshUseCase,
    private meUseCase: MeUseCase,
    private changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  // Limite agressivo contra brute-force de senha: 5 tentativas/min por IP.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.loginUseCase.execute(dto.email, dto.password);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.refreshUseCase.execute(dto.refreshToken);
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
