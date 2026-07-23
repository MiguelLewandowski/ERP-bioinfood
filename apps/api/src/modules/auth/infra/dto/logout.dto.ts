import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;

  /** Encerra todas as sessões do usuário, não só a deste navegador. */
  @IsOptional()
  @IsBoolean()
  allDevices?: boolean;
}
