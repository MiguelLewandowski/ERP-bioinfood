import { InteractionDirection, InteractionType } from '@prisma/client';
import {
  IsDateString, IsEnum, IsOptional, IsString, MaxLength,
} from 'class-validator';

export class UpdateInteractionDto {
  @IsOptional()
  @IsString()
  contactId?: string | null;

  @IsOptional()
  @IsEnum(InteractionType)
  type?: InteractionType;

  @IsOptional()
  @IsEnum(InteractionDirection)
  direction?: InteractionDirection;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string | null;

  @IsOptional()
  @IsString()
  fullContent?: string | null;

  @IsOptional()
  @IsDateString()
  interactionAt?: string;
}
