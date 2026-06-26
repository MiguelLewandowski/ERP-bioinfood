import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class UpdateWbsNodeDto {
  @IsOptional() @IsString() parentId?: string | null;

  @IsOptional() @IsString() @MaxLength(20)   code?: string;
  @IsOptional() @IsString() @MaxLength(200)  title?: string;

  @IsOptional() @IsString() @MaxLength(200)  owner?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) readyCriteria?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) outputs?: string | null;

  @IsOptional() @IsInt() @Min(0) order?: number;
}
