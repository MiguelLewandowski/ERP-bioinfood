import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AUTH_REPOSITORY } from '../domain/auth.repository';
import { TOKEN_SERVICE } from '../domain/token.service';
import { AuthPrismaRepository } from './auth.prisma.repository';
import { JwtTokenService } from './jwt-token.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { LoginUseCase } from '../application/login.use-case';
import { RefreshUseCase } from '../application/refresh.use-case';
import { MeUseCase } from '../application/me.use-case';
import { ChangePasswordUseCase } from '../application/change-password.use-case';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: AUTH_REPOSITORY, useClass: AuthPrismaRepository },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    JwtStrategy,
    LoginUseCase,
    RefreshUseCase,
    MeUseCase,
    ChangePasswordUseCase,
  ],
  exports: [JwtModule],
})
export class AuthModule {}
