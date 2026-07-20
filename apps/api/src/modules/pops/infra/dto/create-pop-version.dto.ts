import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreatePopVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changeNotes?: string;

  // Placeholder — upload de PDF ainda não implementado. Aceita uma URL crua
  // se um dia vier de outro fluxo, mas nenhum endpoint escreve nisso ainda.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  fileUrl?: string;
}
