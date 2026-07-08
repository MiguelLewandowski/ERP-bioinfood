import { IsEnum } from 'class-validator';
import { PartyRoleType } from '@prisma/client';

export class PartyRoleDto {
  @IsEnum(PartyRoleType)
  type: PartyRoleType;
}
