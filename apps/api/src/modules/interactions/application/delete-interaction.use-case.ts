import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { INTERACTION_REPOSITORY, IInteractionRepository } from '../domain/interaction.repository';

@Injectable()
export class DeleteInteractionUseCase {
  constructor(
    @Inject(INTERACTION_REPOSITORY) private repo: IInteractionRepository,
  ) {}

  async execute(id: string, requester: { id: string; role: SystemRole }) {
    const authorId = await this.repo.findAuthorId(id);
    if (authorId === undefined) throw new NotFoundException('Interação não encontrada');
    if (requester.role !== SystemRole.ADMIN && authorId !== requester.id) {
      throw new ForbiddenException('Só o autor ou um ADMIN pode excluir esta interação');
    }
    await this.repo.softDelete(id);
  }
}
