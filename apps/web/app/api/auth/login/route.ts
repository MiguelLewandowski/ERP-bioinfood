import { NextRequest, NextResponse } from 'next/server';
import type { AuthLoginResponseDto } from '@bioinfood/shared';

export async function POST(req: NextRequest) {
  const body = await req.json();

  let apiRes: Response;
  try {
    apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ message: 'Serviço indisponível. Tente novamente.' }, { status: 503 });
  }

  if (!apiRes.ok) {
    const err = await apiRes.json().catch(() => ({}));
    return NextResponse.json(
      { message: err.message ?? 'Credenciais inválidas' },
      { status: apiRes.status },
    );
  }

  // Mesmo contrato compartilhado do /auth/refresh — aqui o par vem envelopado
  // em `tokens`, e é essa assimetria entre os dois endpoints que causou o bug
  // de sessão (docs/incidentes/sessao-expira.md). Tipar deixa a diferença
  // explícita em vez de implícita.
  const data: AuthLoginResponseDto = await apiRes.json();
  const res = NextResponse.json({ user: data.user });

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
  res.cookies.set('must_change_password', data.user.mustChangePassword ? '1' : '0', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return res;
}
