import { IsArray, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertCharterDto {
  @IsOptional() @IsString() @MaxLength(200)  projectType?: string | null;
  @IsOptional() @IsString() @MaxLength(100)  priority?: string | null;
  @IsOptional() @IsString() @MaxLength(200)  projectOwnerId?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) problem?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) justification?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) assumptions?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) mainObjective?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) specificObjectives?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) kpis?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) scope?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) outOfScope?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) deliverables?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) infrastructure?: string | null;
  @IsOptional() @IsNumber()                  budget?: number | null;
  @IsOptional() @IsArray() @IsString({ each: true }) teamUserIds?: string[];
  @IsOptional() @IsString() @MaxLength(4000) governance?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) dependencies?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) constraints?: string | null;
}
