import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min,
  ValidateNested,
} from 'class-validator';

export class UpdateOpportunityDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number | null;

  @IsOptional()
  @IsString()
  mainContactId?: string | null;

  @IsOptional()
  @IsString()
  responsibleId?: string | null;

  @IsOptional()
  @IsString()
  engagementStageId?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string | null;
}

export class MoveOpportunityDto {
  @IsString()
  stageId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lostReason?: string;
}

export class FreezeOpportunityDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class ReorderOpportunityItemDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderOpportunitiesDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReorderOpportunityItemDto)
  items: ReorderOpportunityItemDto[];
}
