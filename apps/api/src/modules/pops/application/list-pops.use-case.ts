import { Injectable, Inject } from '@nestjs/common';
import { IPopRepository, POP_REPOSITORY } from '../domain/pops.repository.interface';

@Injectable()
export class ListPopsUseCase {
  constructor(@Inject(POP_REPOSITORY) private repo: IPopRepository) {}

  execute() {
    return this.repo.findAll();
  }
}
