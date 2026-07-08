import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { StakeholderType, RiskImpact } from '@prisma/client';

export class CreateStakeholderDto {
  @IsString()
  contactId: string;

  @IsEnum(StakeholderType)
  type: StakeholderType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  roleNote?: string;

  @IsOptional()
  @IsEnum(RiskImpact)
  influence?: RiskImpact;

  @IsOptional()
  @IsEnum(RiskImpact)
  interest?: RiskImpact;
}
