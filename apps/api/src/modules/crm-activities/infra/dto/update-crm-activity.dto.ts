import { ActivityStatus, TaskPriority } from '@prisma/client';
import {
  IsDateString, IsEnum, IsOptional, IsString, MaxLength,
} from 'class-validator';

export class UpdateCrmActivityDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @IsString()
  responsibleId?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
