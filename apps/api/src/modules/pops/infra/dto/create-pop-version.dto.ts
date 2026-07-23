import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class CreatePopVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changeNotes?: string;

  // Link do documento desta versão. Só http/https — evita que `javascript:`
  // vire href clicável no frontend.
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  fileUrl?: string;
}
