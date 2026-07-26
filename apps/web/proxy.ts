import { NextRequest, NextResponse } from 'next/server';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function jwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function isExpiringSoon(exp: number): boolean {
  return exp < Math.floor(Date.now() / 1000) + 60;
}

async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.tokens ?? null;
  } catch {
    return null;
  }
}

function clearAuthAndRedirect(req: NextRequest): NextResponse {
  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.delete('access_token');
  res.cookies.delete('refresh_token');
  return res;
}

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Deixa rotas públicas e de API passarem sem verificação.
  //
  // `/api/` inteiro fica de fora, e isso vale para o `/api/proxy` tanto quanto
  // para o `/api/auth`: quem chama espera JSON. Redirecionar uma chamada de
  // fetch para a tela de login faz o navegador seguir o 307 e devolver HTML com
  // status 200 — o cliente então quebra em `JSON.parse` com "Unexpected token
  // '<'", que não diz nada sobre sessão expirada.
  //
  // Sem sessão válida o caminho correto é o proxy encaminhar e a API responder
  // 401 de verdade; o `request()` do `lib/api.ts` já renova e repete a chamada,
  // e só manda para o login se a renovação falhar.
  if (
    pathname === '/' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const accessToken  = req.cookies.get('access_token')?.value;
  const refreshToken = req.cookies.get('refresh_token')?.value;

  // Sem nenhum token → redireciona para login
  if (!accessToken && !refreshToken) {
    return clearAuthAndRedirect(req);
  }

  const mustChangePassword = req.cookies.get('must_change_password')?.value === '1';
  if (mustChangePassword && pathname !== '/change-password') {
    return NextResponse.redirect(new URL('/change-password', req.url));
  }

  // Access token presente e ainda válido → deixa passar
  if (accessToken) {
    const exp = jwtExp(accessToken);
    if (exp && !isExpiringSoon(exp)) {
      return NextResponse.next();
    }
  }

  // Access token ausente ou expirando → tenta renovar com refresh token
  if (!refreshToken) {
    return clearAuthAndRedirect(req);
  }

  const tokens = await refreshTokens(refreshToken);
  if (!tokens) {
    return clearAuthAndRedirect(req);
  }

  // Renova os cookies na resposta (middleware pode fazer cookies.set)
  const res = NextResponse.next();
  res.cookies.set('access_token', tokens.accessToken, {
    ...COOKIE_OPTS,
    maxAge: 60 * 15,
  });
  res.cookies.set('refresh_token', tokens.refreshToken, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export const config = {
  // Exclui assets do Next e qualquer arquivo estático de public/ (caminhos com extensão).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
