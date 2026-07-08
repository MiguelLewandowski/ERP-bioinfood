import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../domain/organization.repository';

@Injectable()
export class GetStaleOrganizationsUseCase {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private repo: IOrganizationRepository) {}

  execute(days: number) {
    if (!Number.isFinite(days) || days <= 0) {
      throw new BadRequestException('days deve ser um número positivo');
    }
    return this.repo.findStale(days);
  }
}
