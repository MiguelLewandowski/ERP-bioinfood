import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IUserRepository } from '../domain/user.repository';
import { CreateUserData, UpdateUserData, UserView } from '../domain/user.entity';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersPrismaRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number, limit: number): Promise<{ items: UserView[]; total: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ skip, take: limit, select: USER_SELECT, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count(),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<UserView | null> {
    return this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  }

  async findByEmail(email: string): Promise<UserView | null> {
    return this.prisma.user.findUnique({ where: { email }, select: USER_SELECT });
  }

  async create(data: CreateUserData): Promise<UserView> {
    return this.prisma.user.create({ data, select: USER_SELECT });
  }

  async update(id: string, data: UpdateUserData): Promise<UserView> {
    return this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
  }

  async resetPassword(id: string, passwordHash: string): Promise<UserView> {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
      select: USER_SELECT,
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
