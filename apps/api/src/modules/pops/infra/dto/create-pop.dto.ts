import { IsString, IsOptional, MaxLength, MinLength, IsUrl } from 'class-validator';

export class CreatePopDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // Obrigatória: toda POP pertence a uma categoria.
  @IsString()
  @MinLength(1)
  categoryId: string;

  // Link do documento (Drive, SharePoint...). Só http/https — evita `javascript:`
  // e afins virarem href clicável no frontend.
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  fileUrl?: string;
}
