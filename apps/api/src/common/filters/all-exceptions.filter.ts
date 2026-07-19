import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

// Tipagem estrutural mínima do req/res do Express — evita depender de
// @types/express só para este filtro.
interface Req {
  method: string;
  url: string;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

/**
 * Filtro global: dá a TODA resposta de erro o mesmo shape `{ statusCode,
 * message }` que o frontend já espera (o front faz `err.message ?? 'Erro'`).
 * Erros não-HTTP (bug, falha de DB) viram 500 genérico — nunca vaza stack
 * trace, SQL ou mensagem interna para o cliente; o detalhe fica no log do
 * servidor. Ver docs/analise-seguranca.md I4.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Res>();
    const req = ctx.getRequest<Req>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      // Preserva o shape do Nest (o ValidationPipe devolve `message` como array).
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: unknown }).message ?? exception.message);
      res.status(status).json({ statusCode: status, message });
      return;
    }

    // Qualquer coisa não prevista: loga o detalhe no servidor, devolve genérico.
    this.logger.error(
      `Unhandled error on ${req.method} ${req.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
    });
  }
}
