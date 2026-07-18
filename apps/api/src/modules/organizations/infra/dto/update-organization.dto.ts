import {
  IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf,
} from 'class-validator';
import { DocumentType, OrganizationStatus, RegistrationStatus } from '@prisma/client';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  // Omitido = não altera. Se enviado, obrigatório não-vazio a menos que
  // documentType = FOREIGN — decisão 5 do crm-redesign-2026-07.
  @ValidateIf((o) => o.document !== undefined && o.documentType !== DocumentType.FOREIGN)
  @IsString()
  @IsNotEmpty({ message: 'CNPJ é obrigatório (ou marque a empresa como estrangeira)' })
  @MaxLength(20)
  document?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @IsOptional()
  @IsEnum(RegistrationStatus)
  registrationStatus?: RegistrationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  stateRegistration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cityRegistration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnae?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsString()
  sectorId?: string | null;

  @IsOptional()
  @IsString()
  sourceId?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  fax?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ramal?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  facebook?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  twitter?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  linkedin?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  skype?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  instagram?: string | null;
}
