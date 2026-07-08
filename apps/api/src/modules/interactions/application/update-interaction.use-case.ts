import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { INTERACTION_REPOSITORY, IInteractionRepository } from '../domain/interaction.repository';
import { UpdateInteractionData } from '../domain/interaction.entity';

@Injectable()
export class UpdateInteractionUseCase {
  constructor(
    @Inject(INTERACTION_REPOSITORY) private repo: IInteractionRepository,
  ) {}

  async execute(
    id: string,
    data: UpdateInteractionData,
    requester: { id: string; role: SystemRole },
  ) {
    const authorId = await this.repo.findAuthorId(id);
    if (authorId === undefined) throw new NotFoundException('Interação não encontrada');
    if (requester.role !== SystemRole.ADMIN && authorId !== requester.id) {
      throw new ForbiddenException('Só o autor ou um ADMIN pode editar esta interação');
    }
    return this.repo.update(id, data);
  }
}
