import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  wbsNodeId?: string | null;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  storyPoints?: number | null;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
