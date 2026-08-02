import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStockItemDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsString() @IsNotEmpty() categoryId!: string;
  @IsOptional() @IsString() @MaxLength(60) code?: string | null;
  @IsOptional() @IsInt() @Min(0) quantity?: number;
  @IsOptional() @IsString() @MaxLength(20) unit?: string | null;
  @IsOptional() @IsString() @MaxLength(200) location?: string | null;
  @IsOptional() @IsString() @MaxLength(20) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}

export class UpdateStockItemDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @IsNotEmpty() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(60) code?: string | null;
  @IsOptional() @IsInt() @Min(0) quantity?: number;
  @IsOptional() @IsString() @MaxLength(20) unit?: string | null;
  @IsOptional() @IsString() @MaxLength(200) location?: string | null;
  @IsOptional() @IsString() @MaxLength(20) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}

export class CreateStockCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
}

export class UpdateStockCategoryDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
