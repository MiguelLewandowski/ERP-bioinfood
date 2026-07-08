import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { StakeholderType, RiskImpact } from '@prisma/client';

export class UpdateStakeholderDto {
  @IsOptional()
  @IsEnum(StakeholderType)
  type?: StakeholderType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  roleNote?: string | null;

  @IsOptional()
  @IsEnum(RiskImpact)
  influence?: RiskImpact | null;

  @IsOptional()
  @IsEnum(RiskImpact)
  interest?: RiskImpact | null;
}
