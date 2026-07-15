import { SystemRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: SystemRole;
  jti?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserForAuth {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  isActive: boolean;
  passwordHash: string;
  mustChangePassword: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  role: SystemRole;
}
