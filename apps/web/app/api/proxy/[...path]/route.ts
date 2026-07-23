import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy BFF entre o navegador e a API.
 *
 * Motivo: a API autentica por header `Bearer`. Chamando :3001 direto, o client
 * precisava do access token em mãos — e ele acabava no payload RSC, legível por
 * qualquer JS da página (o antigo tradeoff S3 de docs/analise-seguranca.md).
 *
 * Com o proxy, o navegador chama a MESMA origem e manda só o cookie httpOnly;
 * o token é lido aqui, no servidor, e anexado ao encaminhar. Um XSS continua
 * conseguindo fazer requisições autenticadas (o cookie viaja sozinho), mas não
 * consegue mais EXTRAIR um token para usar fora do navegador ou depois.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Cabeçalhos que não podem ser repassados: `host`/`connection` quebram o fetch,
// `cookie` não é usado pela API e `authorization` vindo do cliente seria uma
// forma de contornar o token do cookie.
const STRIPPED = new Set([
  'host', 'connection', 'content-length', 'cookie', 'authorization',
  'x-forwarded-host', 'x-forwarded-proto',
]);

function buildTarget(segments: string[], search: string): string | null {
  // Defesa contra escapar do prefixo da API por travessia de caminho.
  if (segments.some((s) => s === '..' || s.includes('/') || s.includes('\\'))) return null;
  return `${API_URL}/${segments.map(encodeURIComponent).join('/')}${search}`;
}

async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  const target = buildTarget(path ?? [], req.nextUrl.search);
  if (!target) {
    return NextResponse.json({ message: 'Caminho inválido' }, { status: 400 });
  }

  const token = req.cookies.get('access_token')?.value;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIPPED.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // O rate limit da API é por IP. Sem isto, todas as requisições chegariam com
  // o IP do servidor Next e um único usuário estouraria o teto de todo mundo.
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (clientIp) headers.set('x-forwarded-for', clientIp);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch {
    return NextResponse.json({ message: 'Serviço indisponível' }, { status: 503 });
  }

  // Repassa corpo e status crus para o `getErrorMessage` do client continuar
  // lendo as mensagens de validação do Nest.
  const body = await upstream.text();
  return new NextResponse(body || null, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
