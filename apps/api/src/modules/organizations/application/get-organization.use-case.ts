import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../domain/organization.repository';

@Injectable()
export class GetOrganizationUseCase {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private repo: IOrganizationRepository) {}

  async execute(id: string) {
    const organization = await this.repo.findById(id);
    if (!organization) throw new NotFoundException('Cliente não encontrado');
    return organization;
  }
}
