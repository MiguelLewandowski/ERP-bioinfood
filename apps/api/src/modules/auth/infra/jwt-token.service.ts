import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { ITokenService, TokenPairWithMeta } from '../domain/token.service';
import { JwtPayload } from '../domain/auth.types';

const REFRESH_EXPIRY_DAYS = 7;

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(private jwtService: JwtService) {}

  generatePair(payload: JwtPayload): TokenPairWithMeta {
    const jti = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);

    const accessToken = this.jwtService.sign(
      { sub: payload.sub, email: payload.email, role: payload.role },
      { expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: payload.sub, email: payload.email, role: payload.role, jti },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: `${REFRESH_EXPIRY_DAYS}d` },
    );

    return { accessToken, refreshToken, jti, expiresAt };
  }

  verifyRefresh(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
