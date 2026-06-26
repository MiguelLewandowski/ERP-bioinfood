import { IsString, IsOptional, IsDateString, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  reached?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
