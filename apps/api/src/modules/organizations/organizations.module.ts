import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ORGANIZATION_REPOSITORY } from './domain/organization.repository';
import { CNPJ_ENRICHMENT_GATEWAY } from './domain/cnpj-enrichment.gateway';
import { OrganizationsPrismaRepository } from './infra/organizations.prisma.repository';
import { BrasilApiEnrichmentGateway } from './infra/brasilapi-enrichment.gateway';
import { OrganizationsController } from './infra/organizations.controller';
import { ListOrganizationsUseCase } from './application/list-organizations.use-case';
import { GetOrganizationUseCase } from './application/get-organization.use-case';
import { CreateOrganizationUseCase } from './application/create-organization.use-case';
import { UpdateOrganizationUseCase } from './application/update-organization.use-case';
import { EnrichOrganizationUseCase } from './application/enrich-organization.use-case';
import { ManageRolesUseCase } from './application/manage-roles.use-case';
import { ManageAddressesUseCase } from './application/manage-addresses.use-case';
import { ManageProductServicesUseCase } from './application/manage-product-services.use-case';
import { UpsertCustomerProfileUseCase } from './application/upsert-customer-profile.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationsController],
  providers: [
    { provide: ORGANIZATION_REPOSITORY, useClass: OrganizationsPrismaRepository },
    { provide: CNPJ_ENRICHMENT_GATEWAY, useClass: BrasilApiEnrichmentGateway },
    ListOrganizationsUseCase,
    GetOrganizationUseCase,
    CreateOrganizationUseCase,
    UpdateOrganizationUseCase,
    EnrichOrganizationUseCase,
    ManageRolesUseCase,
    ManageAddressesUseCase,
    ManageProductServicesUseCase,
    UpsertCustomerProfileUseCase,
  ],
})
export class OrganizationsModule {}
