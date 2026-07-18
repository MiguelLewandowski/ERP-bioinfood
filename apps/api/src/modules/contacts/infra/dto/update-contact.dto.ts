import {
  IsDateString, IsEmail, IsOptional, IsString, MaxLength,
} from 'class-validator';

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  fax?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ramal?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  twitter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkedin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  skype?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  sourceId?: string | null;
}
