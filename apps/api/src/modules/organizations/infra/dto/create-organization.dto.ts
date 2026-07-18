import {
  IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf,
} from 'class-validator';
import { DocumentType, PartyType } from '@prisma/client';

export class CreateOrganizationDto {
  @IsString()
  @MaxLength(200)
  legalName: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  // CNPJ obrigatório, exceto quando a empresa é marcada como estrangeira
  // (documentType = FOREIGN) — decisão 5 do crm-redesign-2026-07.
  @ValidateIf((o) => o.documentType !== DocumentType.FOREIGN)
  @IsString()
  @IsNotEmpty({ message: 'CNPJ é obrigatório (ou marque a empresa como estrangeira)' })
  @MaxLength(20)
  document?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsOptional()
  @IsEnum(PartyType)
  partyType?: PartyType;

  @IsOptional()
  @IsString()
  sectorId?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
