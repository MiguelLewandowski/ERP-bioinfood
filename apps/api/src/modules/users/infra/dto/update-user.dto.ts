import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { SystemRole } from '@prisma/client';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(SystemRole)
  @IsOptional()
  role?: SystemRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
