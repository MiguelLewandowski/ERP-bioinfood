import { NextRequest, NextResponse } from 'next/server';

/**
 * Guarda de navegação. **Não renova sessão** — de propósito.
 *
 * Ele renovava, e isso derrubava o usuário do nada: o refresh é rotativo de uso
 * único, e o middleware (servidor) disparava a renovação em paralelo com o
 * `refreshOnce()` do navegador, que não o enxerga. As duas chegavam com o mesmo
 * jti, a segunda batia na detecção de reuso do backend e — corretamente, dado o
 * que ela sabe — tratava como token roubado, revogando TODAS as sessões.
 *
 * Hoje existe um caminho só para renovar, e ele é single-flight:
 *   - chamada de API que toma 401 → `refreshOnce()` em `lib/api.ts`
 *   - navegação RSC com access token vencido → o layout detecta `refreshable`
 *     e renderiza o `SessionRefreshGate`, que chama o mesmo `refreshOnce()`
 *
 * Aqui sobra só o que ninguém mais faz: barrar quem não tem sessão nenhuma e
 * empurrar a troca de senha obrigatória.
 */
function clearAuthAndRedirect(req: NextRequest): NextResponse {
  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.delete('access_token');
  res.cookies.delete('refresh_token');
  res.cookies.delete('must_change_password');
  return res;
}

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Rotas públicas e todo o /api/ passam direto. O /api/proxy precisa disso:
  // redirecionar um fetch que espera JSON devolve HTML e quebra o cliente.
  if (
    pathname === '/' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get('access_token')?.value;
  const refreshToken = req.cookies.get('refresh_token')?.value;

  // Sem nada em mãos não há o que renovar — é login de fato.
  if (!accessToken && !refreshToken) {
    return clearAuthAndRedirect(req);
  }

  const mustChangePassword = req.cookies.get('must_change_password')?.value === '1';
  if (mustChangePassword && pathname !== '/change-password') {
    return NextResponse.redirect(new URL('/change-password', req.url));
  }

  // Access token vencido mas refresh em mãos: deixa passar. O layout vê
  // `refreshable` e o SessionRefreshGate renova no cliente, sem corrida.
  return NextResponse.next();
}

export const config = {
  // Exclui assets do Next e qualquer arquivo estático de public/ (caminhos com extensão).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
