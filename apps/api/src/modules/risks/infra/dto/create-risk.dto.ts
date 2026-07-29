import { IsString, IsOptional, IsEnum, IsArray, ArrayMaxSize, MaxLength, MinLength } from 'class-validator';
import { RiskProbability, RiskImpact } from '@prisma/client';

export class CreateRiskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(RiskProbability)
  probability: RiskProbability;

  @IsEnum(RiskImpact)
  impact: RiskImpact;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  response?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  // Teto de 20: a lista alimenta um seletor de gente da empresa, não é campo
  // aberto. Sem limite, um payload grande vira N inserts numa transação só.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  coOwnerIds?: string[];
}
