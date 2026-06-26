import { IsString, IsOptional, IsInt, Min, MaxLength, MinLength } from 'class-validator';

export class CreateWbsNodeDto {
  @IsOptional() @IsString() parentId?: string;

  @IsString() @MinLength(1) @MaxLength(20)  code: string;
  @IsString() @MinLength(1) @MaxLength(200) title: string;

  @IsOptional() @IsString() @MaxLength(200)  owner?: string;
  @IsOptional() @IsString() @MaxLength(1000) readyCriteria?: string;
  @IsOptional() @IsString() @MaxLength(1000) outputs?: string;

  @IsOptional() @IsInt() @Min(0) order?: number;
}
