import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, UseGuards, BadRequestException,
} from '@nestjs/common';
import { PartyRoleType, SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListOrganizationsUseCase } from '../application/list-organizations.use-case';
import { GetOrganizationUseCase } from '../application/get-organization.use-case';
import { CreateOrganizationUseCase } from '../application/create-organization.use-case';
import { UpdateOrganizationUseCase } from '../application/update-organization.use-case';
import { EnrichOrganizationUseCase } from '../application/enrich-organization.use-case';
import { ManageRolesUseCase } from '../application/manage-roles.use-case';
import { ManageAddressesUseCase } from '../application/manage-addresses.use-case';
import { ManageProductServicesUseCase } from '../application/manage-product-services.use-case';
import { UpsertCustomerProfileUseCase } from '../application/upsert-customer-profile.use-case';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { PartyRoleDto } from './dto/party-role.dto';
import { AddressDto } from './dto/address.dto';
import { CustomerProfileDto } from './dto/customer-profile.dto';
import { ProductServiceLinkDto } from './dto/product-service-link.dto';
import {
  toOrganizationDetailDto, toOrganizationDto, toOrgAddressDto, toOrgCustomerProfileDto, toOrgRoleDto,
} from './organization.mapper';

// Escrita do CRM é exclusiva do ADMIN (decisão do owner). Leitura permanece
// para todos os papéis internos; CLIENTE nunca acessa.
const WRITE = [SystemRole.ADMIN] as const;
const ROLE_ADMINS = [SystemRole.ADMIN] as const;

@Controller('organizations')
@UseGuards(RolesGuard)
@Roles(SystemRole.PADRAO)
export class OrganizationsController {
  constructor(
    private listOrganizations: ListOrganizationsUseCase,
    private getOrganization: GetOrganizationUseCase,
    private createOrganization: CreateOrganizationUseCase,
    private updateOrganization: UpdateOrganizationUseCase,
    private enrichOrganization: EnrichOrganizationUseCase,
    private manageRoles: ManageRolesUseCase,
    private manageAddresses: ManageAddressesUseCase,
    private manageProductServices: ManageProductServicesUseCase,
    private upsertCustomerProfile: UpsertCustomerProfileUseCase,
  ) {}

  @Get()
  async list() {
    const organizations = await this.listOrganizations.execute();
    return organizations.map(toOrganizationDto);
  }

  // Declared before ':id' — two segments, so no clash, but explicit is clearer.
  @Get('enrich/:cnpj')
  @Roles(...WRITE)
  enrich(@Param('cnpj') cnpj: string) {
    return this.enrichOrganization.execute(cnpj);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return toOrganizationDetailDto(await this.getOrganization.execute(id));
  }

  @Post()
  @Roles(...WRITE)
  async create(@Body() dto: CreateOrganizationDto) {
    return toOrganizationDto(await this.createOrganization.execute(dto));
  }

  @Patch(':id')
  @Roles(...WRITE)
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return toOrganizationDetailDto(await this.updateOrganization.execute(id, dto));
  }

  @Post(':id/roles')
  @Roles(...ROLE_ADMINS)
  async addRole(@Param('id') id: string, @Body() dto: PartyRoleDto) {
    return toOrgRoleDto(await this.manageRoles.add(id, dto.type));
  }

  @Delete(':id/roles/:type')
  @Roles(...ROLE_ADMINS)
  @HttpCode(204)
  async removeRole(@Param('id') id: string, @Param('type') type: string) {
    if (!(type in PartyRoleType)) throw new BadRequestException('Papel inválido');
    await this.manageRoles.remove(id, type as PartyRoleType);
  }

  @Post(':id/addresses')
  @Roles(...WRITE)
  async addAddress(@Param('id') id: string, @Body() dto: AddressDto) {
    return toOrgAddressDto(await this.manageAddresses.add(id, dto));
  }

  @Patch(':id/addresses/:addressId')
  @Roles(...WRITE)
  async updateAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() dto: AddressDto,
  ) {
    return toOrgAddressDto(await this.manageAddresses.update(id, addressId, dto));
  }

  @Delete(':id/addresses/:addressId')
  @Roles(...WRITE)
  @HttpCode(204)
  async removeAddress(@Param('id') id: string, @Param('addressId') addressId: string) {
    await this.manageAddresses.remove(id, addressId);
  }

  @Patch(':id/customer-profile')
  @Roles(...WRITE)
  async customerProfile(@Param('id') id: string, @Body() dto: CustomerProfileDto) {
    return toOrgCustomerProfileDto(await this.upsertCustomerProfile.execute(id, dto));
  }

  @Post(':id/product-services')
  @Roles(...WRITE)
  addProductService(@Param('id') id: string, @Body() dto: ProductServiceLinkDto) {
    return this.manageProductServices.add(id, dto.productServiceId);
  }

  @Delete(':id/product-services/:productServiceId')
  @Roles(...WRITE)
  @HttpCode(204)
  async removeProductService(@Param('id') id: string, @Param('productServiceId') productServiceId: string) {
    await this.manageProductServices.remove(id, productServiceId);
  }
}
