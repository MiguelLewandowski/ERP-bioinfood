import { Injectable, Inject } from '@nestjs/common';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../domain/organization.repository';

@Injectable()
export class ListOrganizationsUseCase {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private repo: IOrganizationRepository) {}

  execute() {
    return this.repo.findAll();
  }
}
