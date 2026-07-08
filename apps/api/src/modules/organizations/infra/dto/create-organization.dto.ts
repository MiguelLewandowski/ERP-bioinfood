import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentType, PartyType } from '@prisma/client';

export class CreateOrganizationDto {
  @IsString()
  @MaxLength(200)
  legalName: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @IsOptional()
  @IsString()
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
}
