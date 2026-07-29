import { IsString, IsOptional, IsEnum, IsArray, ArrayMaxSize, MaxLength } from 'class-validator';
import { RiskProbability, RiskImpact } from '@prisma/client';

export class UpdateRiskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsEnum(RiskProbability)
  probability?: RiskProbability;

  @IsOptional()
  @IsEnum(RiskImpact)
  impact?: RiskImpact;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  response?: string | null;

  @IsOptional()
  @IsString()
  ownerId?: string | null;

  // Ausente = não mexe na lista. Presente substitui a lista inteira.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  coOwnerIds?: string[];
}
