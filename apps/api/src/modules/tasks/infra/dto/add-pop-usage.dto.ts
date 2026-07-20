import { IsString } from 'class-validator';

export class AddPopUsageDto {
  @IsString()
  popVersionId: string;
}
