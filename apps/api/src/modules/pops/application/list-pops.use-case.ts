import { Injectable, Inject } from '@nestjs/common';
import { IPopRepository, POP_REPOSITORY, PopFilter } from '../domain/pops.repository.interface';

@Injectable()
export class ListPopsUseCase {
  constructor(@Inject(POP_REPOSITORY) private repo: IPopRepository) {}

  execute(filter: PopFilter = {}) {
    return this.repo.findAll(filter);
  }
}
