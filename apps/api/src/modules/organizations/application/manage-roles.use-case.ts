import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PartyRoleType } from '@prisma/client';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../domain/organization.repository';

@Injectable()
export class ManageRolesUseCase {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private repo: IOrganizationRepository) {}

  async add(orgId: string, type: PartyRoleType) {
    await this.assertExists(orgId);
    return this.repo.addRole(orgId, type);
  }

  async remove(orgId: string, type: PartyRoleType) {
    await this.assertExists(orgId);
    await this.repo.removeRole(orgId, type);
  }

  private async assertExists(orgId: string) {
    const org = await this.repo.findById(orgId);
    if (!org) throw new NotFoundException('Organização não encontrada');
  }
}
