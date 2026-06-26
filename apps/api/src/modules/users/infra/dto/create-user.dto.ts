import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SystemRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(SystemRole)
  @IsOptional()
  role?: SystemRole;
}
