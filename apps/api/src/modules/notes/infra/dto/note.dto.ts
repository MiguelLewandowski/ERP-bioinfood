import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * ⚠️ Nenhum DTO aqui tem `ownerId` — e não deve passar a ter. O dono vem do
 * JWT no controller. Aceitá-lo do cliente destruiria a privacidade da nota,
 * que é a única garantia desse tipo no ERP inteiro (ver CLAUDE.md).
 */
export class CreateNoteDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  // Texto rico: o limite é generoso porque markup consome orçamento de tamanho.
  @IsOptional() @IsString() @MaxLength(100_000) contentHtml?: string | null;
  @IsOptional() @IsBoolean() pinned?: boolean;
}

export class UpdateNoteDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(100_000) contentHtml?: string | null;
  @IsOptional() @IsBoolean() pinned?: boolean;
}
