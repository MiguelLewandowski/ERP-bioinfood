import { CreateUserData, UpdateUserData, UserView } from './user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface IUserRepository {
  findAll(page: number, limit: number): Promise<{ users: UserView[]; total: number }>;
  findById(id: string): Promise<UserView | null>;
  findByEmail(email: string): Promise<UserView | null>;
  create(data: CreateUserData): Promise<UserView>;
  update(id: string, data: UpdateUserData): Promise<UserView>;
}
