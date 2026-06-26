import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IWbsRepository, WBS_REPOSITORY } from '../domain/wbs.repository.interface';

@Injectable()
export class DeleteWbsNodeUseCase {
  constructor(@Inject(WBS_REPOSITORY) private repo: IWbsRepository) {}

  async execute(projectId: string, id: string) {
    const node = await this.repo.findById(id);
    if (!node) throw new NotFoundException('WBS node not found');
    if (node.projectId !== projectId) throw new ForbiddenException('WBS node não pertence a este projeto');
    await this.repo.softDelete(id);
  }
}
