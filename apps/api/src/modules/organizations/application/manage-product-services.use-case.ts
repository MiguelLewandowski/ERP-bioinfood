import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../domain/organization.repository';

@Injectable()
export class ManageProductServicesUseCase {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private repo: IOrganizationRepository) {}

  async add(orgId: string, productServiceId: string) {
    await this.assertExists(orgId);
    return this.repo.addProductService(orgId, productServiceId);
  }

  async remove(orgId: string, productServiceId: string) {
    await this.assertExists(orgId);
    await this.repo.removeProductService(orgId, productServiceId);
  }

  private async assertExists(orgId: string) {
    const org = await this.repo.findById(orgId);
    if (!org) throw new NotFoundException('Organização não encontrada');
  }
}
