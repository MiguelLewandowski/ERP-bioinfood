import { SystemRole } from '@prisma/client';

export interface UserView {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role?: SystemRole;
  mustChangePassword: boolean;
}

export interface UpdateUserData {
  name?: string;
  role?: SystemRole;
  isActive?: boolean;
}
