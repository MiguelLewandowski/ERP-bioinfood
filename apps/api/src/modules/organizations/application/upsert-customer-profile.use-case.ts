import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../domain/organization.repository';
import { CustomerProfileData } from '../domain/organization.entity';

@Injectable()
export class UpsertCustomerProfileUseCase {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private repo: IOrganizationRepository) {}

  async execute(orgId: string, data: CustomerProfileData) {
    const org = await this.repo.findById(orgId);
    if (!org) throw new NotFoundException('Organização não encontrada');
    return this.repo.upsertCustomerProfile(orgId, data);
  }
}
