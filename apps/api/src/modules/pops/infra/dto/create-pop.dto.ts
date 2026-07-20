import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreatePopDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
