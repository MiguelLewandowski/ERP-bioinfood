import { IsString } from 'class-validator';

export class AddDependencyDto {
  @IsString()
  predecessorId: string;
}
