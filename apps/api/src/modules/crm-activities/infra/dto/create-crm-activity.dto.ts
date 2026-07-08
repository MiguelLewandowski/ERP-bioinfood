import { TaskPriority } from '@prisma/client';
import {
  IsDateString, IsEnum, IsOptional, IsString, MaxLength,
} from 'class-validator';

export class CreateCrmActivityDto {
  @IsOptional()
  @IsString()
  orgId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  interactionId?: string;

  @IsOptional()
  @IsString()
  responsibleId?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
