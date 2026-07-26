import { cookies } from 'next/headers';
import type { SystemRole } from '@bioinfood/shared';

export type SessionPayload = { sub: string; email: string; role: SystemRole };

/**
 * Estado da sessão visto pelo servidor (Server Components):
 * - `authenticated`: access token presente E ainda válido.
 * - `refreshable`: access token ausente ou vencido, mas há refresh token (7d) —
 *   a sessão vale, só falta renovar (ver SessionRefreshGate).
 * - `anonymous`: sem access nem refresh → login de fato.
 */
export type SessionState =
  | { status: 'authenticated'; session: SessionPayload }
  | { status: 'refreshable' }
  | { status: 'anonymous' };

/**
 * Margem antes do vencimento. Um token que expira em 2 segundos é inútil: o RSC
 * renderiza, chama a API e toma 401 no meio do caminho — e no servidor não há
 * como renovar, porque o retry de `lib/api.ts` só existe no navegador.
 *
 * Gastar o resto do tempo de vida do token é o que causava `Unauthorized` na
 * tela: o cookie sobrevive alguns segundos ao JWT (o maxAge é gravado na
 * resposta, o `exp` foi carimbado antes disso, e ainda há diferença de relógio
 * entre a API e o navegador).
 */
const EXPIRY_MARGIN_SECONDS = 60;

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('access_token')?.value;
}

/**
 * Lê o payload do JWT sem validar assinatura — quem valida é a API. Aqui só
 * interessa saber quem é e se ainda dá tempo de usar.
 */
export function decodeSession(token: string): (SessionPayload & { exp?: number }) | null {
  try {
    const { sub, email, role, exp } = JSON.parse(atob(token.split('.')[1]));
    if (!sub) return null;
    return { sub, email, role, exp: typeof exp === 'number' ? exp : undefined };
  } catch {
    return null;
  }
}

export function isUsable(exp: number | undefined): boolean {
  // Sem `exp` legível, deixa a API decidir em vez de derrubar a sessão aqui.
  if (exp === undefined) return true;
  return exp > Math.floor(Date.now() / 1000) + EXPIRY_MARGIN_SECONDS;
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const decoded = decodeSession(token);
  if (!decoded) return null;
  const { exp, ...session } = decoded;
  return session;
}

export async function getSessionState(): Promise<SessionState> {
  const cookieStore = await cookies();

  const access = cookieStore.get('access_token')?.value;
  if (access) {
    const decoded = decodeSession(access);
    if (decoded && isUsable(decoded.exp)) {
      const { exp, ...session } = decoded;
      return { status: 'authenticated', session };
    }
  }

  // Sem access utilizável, mas com refresh: renovável (ver SessionRefreshGate).
  if (cookieStore.get('refresh_token')?.value) return { status: 'refreshable' };

  return { status: 'anonymous' };
}
