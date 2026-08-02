import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  wbsNodeId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  storyPoints?: number;

  @IsOptional()
  @IsBoolean()
  requiresSOP?: boolean;

  // Teto de 20: a lista alimenta um seletor de gente da empresa, não é campo
  // aberto. Sem limite, um payload grande vira N inserts numa transação só.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  coAssigneeIds?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
