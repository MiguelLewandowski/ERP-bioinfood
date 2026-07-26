import { cookies } from 'next/headers';
import type { SystemRole } from '@bioinfood/shared';

export type SessionPayload = { sub: string; email: string; role: SystemRole };

/**
 * Estado da sessão visto pelo servidor (Server Components):
 * - `authenticated`: access token presente e legível.
 * - `refreshable`: access token expirou (o cookie some junto, maxAge = exp =
 *   15min) mas ainda há refresh token (7d) — a sessão vale, só falta renovar.
 * - `anonymous`: sem access nem refresh → login de fato.
 */
export type SessionState =
  | { status: 'authenticated'; session: SessionPayload }
  | { status: 'refreshable' }
  | { status: 'anonymous' };

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('access_token')?.value;
}

function decodeSession(token: string): SessionPayload | null {
  try {
    const { sub, email, role } = JSON.parse(atob(token.split('.')[1]));
    return { sub, email, role };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = await getAccessToken();
  return token ? decodeSession(token) : null;
}

export async function getSessionState(): Promise<SessionState> {
  const cookieStore = await cookies();

  const access = cookieStore.get('access_token')?.value;
  if (access) {
    const session = decodeSession(access);
    if (session) return { status: 'authenticated', session };
  }

  // Sem access válido, mas com refresh: renovável (ver SessionRefreshGate).
  if (cookieStore.get('refresh_token')?.value) return { status: 'refreshable' };

  return { status: 'anonymous' };
}
