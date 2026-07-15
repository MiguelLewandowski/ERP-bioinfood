import { UserForAuth } from './auth.types';

export const AUTH_REPOSITORY = 'AUTH_REPOSITORY';

export interface SaveRefreshTokenData {
  userId: string;
  jti: string;
  expiresAt: Date;
}

export interface IAuthRepository {
  findByEmail(email: string): Promise<UserForAuth | null>;
  findById(id: string): Promise<UserForAuth | null>;
  updatePassword(id: string, passwordHash: string, mustChangePassword: boolean): Promise<void>;
  saveRefreshToken(data: SaveRefreshTokenData): Promise<void>;
  findRefreshToken(jti: string): Promise<{ id: string; revokedAt: Date | null } | null>;
  revokeRefreshToken(jti: string): Promise<void>;
}
