import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { TaskDependencyType } from '@prisma/client';

export class AddDependencyDto {
  @IsString()
  predecessorId: string;

  @IsEnum(TaskDependencyType)
  @IsOptional()
  type?: TaskDependencyType;

  @IsInt()
  @IsOptional()
  lag?: number;
}
