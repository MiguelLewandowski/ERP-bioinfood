import {
  IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min,
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
