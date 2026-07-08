import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLinkDto {
  @IsString()
  orgId: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  department?: string;

  @IsOptional()
  @IsBoolean()
  isDecision?: boolean;

  @IsOptional()
  @IsBoolean()
  isFinance?: boolean;

  @IsOptional()
  @IsBoolean()
  isTechnical?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
