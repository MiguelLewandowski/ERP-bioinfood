import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../domain/organization.repository';
import { AddressData } from '../domain/organization.entity';

@Injectable()
export class ManageAddressesUseCase {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private repo: IOrganizationRepository) {}

  async add(orgId: string, data: AddressData) {
    const org = await this.repo.findById(orgId);
    if (!org) throw new NotFoundException('Organização não encontrada');
    return this.repo.addAddress(orgId, data);
  }

  // Scoped by orgId so an address from another org can't be touched (IDOR).
  async update(orgId: string, addressId: string, data: AddressData) {
    await this.assertAddress(orgId, addressId);
    return this.repo.updateAddress(addressId, data);
  }

  async remove(orgId: string, addressId: string) {
    await this.assertAddress(orgId, addressId);
    await this.repo.removeAddress(addressId);
  }

  private async assertAddress(orgId: string, addressId: string) {
    const address = await this.repo.findAddress(orgId, addressId);
    if (!address) throw new NotFoundException('Endereço não encontrado');
  }
}
