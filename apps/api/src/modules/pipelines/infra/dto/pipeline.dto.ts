import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested,
} from 'class-validator';
import { CreateStageDto } from './stage.dto';

export class CreatePipelineDto {
  @IsString()
  @MaxLength(80)
  name: string;

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
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
