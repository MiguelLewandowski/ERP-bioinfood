export * from './user.entity';

import { SystemRole } from '@prisma/client';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: SystemRole;
}
