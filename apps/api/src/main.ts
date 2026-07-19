import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(new Logger());

  // Atrás do proxy do Railway: confia no primeiro X-Forwarded-For para que o
  // rate limiting enxergue o IP real do cliente (senão o limite vira global,
  // compartilhado por todos os requests que chegam pelo proxy).
  app.set('trust proxy', 1);

  // Headers de proteção + esconde o X-Powered-By do Express.
  app.use(helmet());
  app.disable('x-powered-by');

  // Teto explícito de corpo: um POST gigante não segura/derruba o processo.
  app.useBodyParser('json', { limit: '1mb' });

  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
