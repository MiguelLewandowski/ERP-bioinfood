import { IsUUID } from 'class-validator';

export class GrantAccessDto {
  @IsUUID()
  userId: string;
}
