import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'Sem refresh token' }, { status: 401 });
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return NextResponse.json({ message: 'Serviço indisponível' }, { status: 503 });
  }

  if (!apiRes.ok) {
    const res = NextResponse.json({ message: 'Refresh inválido' }, { status: 401 });
    res.cookies.delete('access_token');
    res.cookies.delete('refresh_token');
    return res;
  }

  const data = await apiRes.json();
  // O access token volta no corpo porque a API (:3001) autentica por header
  // `Bearer`, não por cookie: sem ele o client não tem como refazer a chamada
  // que acabou de tomar 401. Não amplia a exposição — o mesmo token já é
  // injetado no AuthProvider e é legível pelo JS da página (ver S3 em
  // docs/analise-seguranca.md). O refresh token continua só no cookie httpOnly.
  const res = NextResponse.json({ ok: true, accessToken: data.tokens.accessToken });

  res.cookies.set('access_token', data.tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15,
    path: '/',
  });
  res.cookies.set('refresh_token', data.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return res;
}
