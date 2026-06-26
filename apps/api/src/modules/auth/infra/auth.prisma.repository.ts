import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAuthRepository, SaveRefreshTokenData } from '../domain/auth.repository';
import { UserForAuth } from '../domain/auth.types';

@Injectable()
export class AuthPrismaRepository implements IAuthRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserForAuth | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });
  }

  async saveRefreshToken(data: SaveRefreshTokenData): Promise<void> {
    await this.prisma.refreshToken.create({ data });
  }

  async findRefreshToken(jti: string): Promise<{ id: string; revokedAt: Date | null } | null> {
    return this.prisma.refreshToken.findUnique({
      where: { jti },
      select: { id: true, revokedAt: true },
    });
  }

  async revokeRefreshToken(jti: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { jti },
      data: { revokedAt: new Date() },
    });
  }
}
