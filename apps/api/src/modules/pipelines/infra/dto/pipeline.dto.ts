import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, Matches, MaxLength, ValidateNested,
} from 'class-validator';
import { CreateStageDto } from './stage.dto';

// Sigla de 3 letras usada no rail de troca de funil do kanban.
const ABBREVIATION_REGEX = /^[A-ZÀ-Ú]{3}$/;

export class CreatePipelineDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(ABBREVIATION_REGEX, { message: 'abbreviation deve ter exatamente 3 letras' })
  abbreviation: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateStageDto)
  stages?: CreateStageDto[];
}

export class UpdatePipelineDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(ABBREVIATION_REGEX, { message: 'abbreviation deve ter exatamente 3 letras' })
  abbreviation?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
