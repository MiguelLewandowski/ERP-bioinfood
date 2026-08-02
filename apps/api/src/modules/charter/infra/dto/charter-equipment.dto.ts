import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AddCharterEquipmentDto {
  @IsString() @IsNotEmpty() stockItemId!: string;
}

export class UpdateCharterEquipmentDto {
  @IsOptional() @IsBoolean() checked?: boolean;
  @IsOptional() @IsInt() @Min(1) quantity?: number;
}
