import { IsArray, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Campos narrativos passaram a guardar HTML (editor rico do TAP), e markup
 * consome o mesmo orçamento de caracteres do texto: um parágrafo curto gasta
 * `<p></p>` a mais, e uma lista aninhada facilmente triplica o tamanho.
 *
 * O limite antigo era 4000 para todos. Mantê-lo faria um TAP que já cabia
 * passar a ser REJEITADO só por ter ganhado formatação — e o usuário veria
 * "erro ao salvar" sem entender por quê. Daí 20000 nos campos ricos.
 *
 * Não é limite frouxo: 20000 caracteres de HTML são várias páginas de texto
 * formatado, bem acima de qualquer seção de TAP. Os campos de lista fechada
 * (`projectType`, `priority`) continuam curtos.
 */
const RICH = 20_000;

export class UpsertCharterDto {
  @IsOptional() @IsString() @MaxLength(200)  projectType?: string | null;
  @IsOptional() @IsString() @MaxLength(100)  priority?: string | null;
  @IsOptional() @IsString() @MaxLength(200)  projectOwnerId?: string | null;
  @IsOptional() @IsString() @MaxLength(RICH) problem?: string | null;
  @IsOptional() @IsString() @MaxLength(RICH) justification?: string | null;
  @IsOptional() @IsString() @MaxLength(RICH) assumptions?: string | null;
  @IsOptional() @IsString() @MaxLength(RICH) mainObjective?: string | null;
  @IsOptional() @IsString() @MaxLength(RICH) specificObjectives?: string | null;
  @IsOptional() @IsString() @MaxLength(RICH) kpis?: string | null;
  @IsOptional() @IsString() @MaxLength(RICH) scope?: string | null;
  @IsOptional() @IsString() @MaxLength(RICH) outOfScope?: string | null;
  @IsOptional() @IsString() @MaxLength(RICH) deliverables?: string | null;
  @IsOptional() @IsString() @MaxLength(RICH) infrastructure?: string | null;
  @IsOptional() @IsNumber()                  budget?: number | null;
  @IsOptional() @IsArray() @IsString({ each: true }) teamUserIds?: string[];
  @IsOptional() @IsString() @MaxLength(RICH) governance?: string | null;
  @IsOptional() @IsString() @MaxLength(RICH) dependencies?: string | null;
  // Saiu da tela em 28/07/2026, mas a coluna e o DTO continuam: remover é
  // migration destrutiva e levaria junto o que já foi escrito.
  @IsOptional() @IsString() @MaxLength(RICH) constraints?: string | null;
}
