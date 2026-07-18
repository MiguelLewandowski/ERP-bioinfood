import {
  IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';

export class CreateOpportunityDto {
  @IsString()
  orgId: string;

  @IsString()
  pipelineId: string;

  @IsString()
  stageId: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsString()
  mainContactId?: string;

  @IsOptional()
  @IsString()
  responsibleId?: string;

  @IsOptional()
  @IsString()
  engagementStageId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;
}
