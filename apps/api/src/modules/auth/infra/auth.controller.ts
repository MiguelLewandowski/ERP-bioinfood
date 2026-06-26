import { Controller, Post, Body, Get } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { LoginUseCase, LoginResult } from '../application/login.use-case';
import { RefreshUseCase } from '../application/refresh.use-case';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthUser } from '../domain/auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private loginUseCase: LoginUseCase,
    private refreshUseCase: RefreshUseCase,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.loginUseCase.execute(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.refreshUseCase.execute(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
