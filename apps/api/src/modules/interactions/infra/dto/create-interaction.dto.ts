import { InteractionDirection, InteractionType } from '@prisma/client';
import {
  IsDateString, IsEnum, IsOptional, IsString, MaxLength,
} from 'class-validator';

export class CreateInteractionDto {
  @IsString()
  orgId: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsEnum(InteractionType)
  type: InteractionType;

  @IsOptional()
  @IsEnum(InteractionDirection)
  direction?: InteractionDirection;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  fullContent?: string;

  @IsOptional()
  @IsDateString()
  interactionAt?: string;
}
