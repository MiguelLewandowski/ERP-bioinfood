import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IStakeholderRepository, STAKEHOLDER_REPOSITORY } from '../domain/stakeholders.repository.interface';
import { CreateStakeholderData } from '../domain/stakeholder.entity';

@Injectable()
export class CreateStakeholderUseCase {
  constructor(@Inject(STAKEHOLDER_REPOSITORY) private repo: IStakeholderRepository) {}

  async execute(data: CreateStakeholderData) {
    try {
      return await this.repo.create(data);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Este contato já está registrado com esse papel neste projeto');
      }
      throw err;
    }
  }
}
