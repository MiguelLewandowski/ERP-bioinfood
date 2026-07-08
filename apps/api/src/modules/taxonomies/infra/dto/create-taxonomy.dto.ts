import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTaxonomyDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
