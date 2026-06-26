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
  const res = NextResponse.json({ ok: true });

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
