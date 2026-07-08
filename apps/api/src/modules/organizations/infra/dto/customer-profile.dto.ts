import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CustomerStage } from '@prisma/client';

export class CustomerProfileDto {
  @IsOptional()
  @IsEnum(CustomerStage)
  stage?: CustomerStage;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentTerms?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number | null;

  @IsOptional()
  @IsString()
  salesRepId?: string | null;
}
