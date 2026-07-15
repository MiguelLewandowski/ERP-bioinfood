import { Injectable, Inject, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUserRepository, USER_REPOSITORY } from '../domain/user.repository';
import { UserView } from '../domain/user.entity';
import { CreateUserInput } from '../domain/user.types';

@Injectable()
export class CreateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private repo: IUserRepository) {}

  async execute(input: CreateUserInput): Promise<UserView> {
    const exists = await this.repo.findByEmail(input.email);
    if (exists) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.repo.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      mustChangePassword: true,
    });
  }
}
