import { IsString, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
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
}
