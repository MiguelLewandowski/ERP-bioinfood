import { Injectable, Inject } from '@nestjs/common';
import { IWbsRepository, WBS_REPOSITORY } from '../domain/wbs.repository.interface';
import { CreateWbsNodeData } from '../domain/wbs-node.entity';

@Injectable()
export class CreateWbsNodeUseCase {
  constructor(@Inject(WBS_REPOSITORY) private repo: IWbsRepository) {}

  execute(data: CreateWbsNodeData) {
    return this.repo.create(data);
  }
}
