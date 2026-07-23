import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value;

  // Revoga no banco ANTES de apagar os cookies. Sem isto, sair só limpava o
  // navegador e o refresh token continuava valendo por até 7 dias — quem
  // tivesse uma cópia seguia com a sessão viva.
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // API fora do ar não pode impedir o logout local — o cookie some de
      // qualquer forma e o token expira sozinho no prazo dele.
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete('access_token');
  res.cookies.delete('refresh_token');
  res.cookies.delete('must_change_password');
  return res;
}
