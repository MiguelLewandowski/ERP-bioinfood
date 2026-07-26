import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

/**
 * Healthcheck do Railway. Público de propósito: o probe da plataforma não tem
 * token. Responde só `ok`/erro — nada de versão, env ou nome de host, que só
 * serviriam para quem estivesse mapeando o serviço.
 *
 * O ping no banco é o que importa: um processo de pé mas sem Postgres é uma
 * falha, e sem esta consulta o Railway marcaria o deploy como saudável.
 */
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Banco indisponível');
    }
    return { status: 'ok' };
  }
}
