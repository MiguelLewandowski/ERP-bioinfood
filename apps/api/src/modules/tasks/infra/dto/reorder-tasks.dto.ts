import { IsArray, IsString, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReorderItem {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderTasksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items: ReorderItem[];
}
