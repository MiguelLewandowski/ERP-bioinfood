import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AddressType } from '@prisma/client';

export class AddressDto {
  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  complement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;
}
