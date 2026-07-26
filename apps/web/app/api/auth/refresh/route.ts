import { NextRequest, NextResponse } from 'next/server';

type Tokens = { accessToken: string; refreshToken: string };
type Result = { ok: true; tokens: Tokens } | { ok: false; status: 401 | 503 };

/**
 * Renovações concorrentes com o MESMO refresh token compartilham uma única
 * chamada à API.
 *
 * O `refreshOnce()` de `lib/api.ts` já resolve isso dentro de uma aba, mas cada
 * aba tem o seu. Com duas abas abertas, ambas renovam ao mesmo tempo, a API vê o
 * mesmo jti duas vezes e a detecção de reuso derruba todas as sessões — o
 * usuário cai para o login sem ter feito nada.
 *
 * Como todas as abas batem neste mesmo servidor Next, deduplicar aqui cobre o
 * caso. A API continua vendo cada refresh token exatamente uma vez: nada foi
 * afrouxado na detecção de roubo.
 *
 * Limite conhecido: o mapa é por processo. Com mais de uma réplica do serviço
 * `web`, abas atendidas por réplicas diferentes voltam a poder correr. Hoje o
 * Railway roda uma réplica; se isso mudar, a dedupe precisa ir para um lugar
 * compartilhado (Redis) ou a API precisa tolerar a corrida.
 */
const inFlight = new Map<string, Promise<Result>>();

async function callApi(refreshToken: string): Promise<Result> {
  let apiRes: Response;
  try {
    apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return { ok: false, status: 503 };
  }

  if (!apiRes.ok) return { ok: false, status: 401 };

  const data = await apiRes.json();
  return data.tokens
    ? { ok: true, tokens: data.tokens as Tokens }
    : { ok: false, status: 401 };
}

function refreshOnce(refreshToken: string): Promise<Result> {
  const running = inFlight.get(refreshToken);
  if (running) return running;

  const promise = callApi(refreshToken).finally(() => inFlight.delete(refreshToken));
  inFlight.set(refreshToken, promise);
  return promise;
}

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'Sem refresh token' }, { status: 401 });
  }

  const result = await refreshOnce(refreshToken);

  if (!result.ok) {
    if (result.status === 503) {
      // API fora do ar não é sessão inválida: manter os cookies deixa o usuário
      // seguir quando ela voltar, em vez de forçar login por indisponibilidade.
      return NextResponse.json({ message: 'Serviço indisponível' }, { status: 503 });
    }
    const res = NextResponse.json({ message: 'Refresh inválido' }, { status: 401 });
    res.cookies.delete('access_token');
    res.cookies.delete('refresh_token');
    return res;
  }

  // O corpo NÃO devolve o access token: o client não precisa mais dele, porque
  // as chamadas do navegador passam por /api/proxy, que lê o cookie no servidor.
  // Devolver aqui deixaria um XSS emitir tokens novos sob demanda.
  const res = NextResponse.json({ ok: true });

  res.cookies.set('access_token', result.tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15,
    path: '/',
  });
  res.cookies.set('refresh_token', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return res;
}
