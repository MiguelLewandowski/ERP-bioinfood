import { IsString, IsOptional, IsDateString, IsBoolean, IsInt, Min, MaxLength, MinLength } from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsBoolean()
  reached?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
