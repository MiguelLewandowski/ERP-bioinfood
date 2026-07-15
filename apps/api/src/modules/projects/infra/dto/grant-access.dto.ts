import { IsNotEmpty, IsString } from 'class-validator';

export class GrantAccessDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
