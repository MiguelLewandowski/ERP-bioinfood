import { ApiError } from './errors';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BFF_URL =
  typeof window !== 'undefined'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL?.replace('3001', '3000') ?? 'http://localhost:3000');

const isBrowser = () => typeof window !== 'undefined';

/**
 * Token renovado durante a vida desta página.
 *
 * O `token` que os componentes passam vem do `AuthProvider`, congelado no render
 * do servidor. Passados os 15min de validade, TODO componente continua entregando
 * o valor velho — por isso o token renovado precisa ficar guardado aqui e ter
 * precedência.
 *
 * Só no browser: no servidor o escopo de módulo é compartilhado entre requisições
 * e guardar token aqui vazaria a sessão de um usuário para outro.
 */
let browserToken: string | null = null;

/**
 * Uma renovação por vez.
 *
 * O refresh do backend é de uso único — `refresh.use-case.ts` revoga o jti atual
 * e emite outro. Com N chamadas paralelas expirando juntas (o dashboard dispara
 * 5), a primeira renova e as outras chegam com o jti já revogado, recebem 401 e
 * mandam o usuário para o login. Compartilhar a mesma promise mata a corrida.
 */
let inFlightRefresh: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${BFF_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.accessToken ?? null;
  } catch {
    return null;
  }
}

function refreshOnce(): Promise<string | null> {
  inFlightRefresh ??= doRefresh().finally(() => { inFlightRefresh = null; });
  return inFlightRefresh;
}

async function request<T>(
  path: string,
  token?: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const effectiveToken = (isBrowser() && browserToken) || token;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
      ...options.headers,
    },
  });

  // No servidor não há o que renovar: o proxy já trocou os cookies antes do
  // render, e `credentials: 'include'` não manda cookie nenhum a partir daqui.
  if (res.status === 401 && !retried && isBrowser()) {
    const newToken = await refreshOnce();
    if (!newToken) {
      window.location.href = '/';
      throw new ApiError(['Sessão expirada'], 401);
    }
    browserToken = newToken;
    // Refaz com o token NOVO no header. Repetir com o header antigo — como
    // acontecia antes — só rendia outro 401.
    return request<T>(path, newToken, options, true);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // O ValidationPipe do Nest retorna `message` como array quando há mais de
    // um erro de campo — normaliza pra sempre trabalhar com string[].
    const messages = Array.isArray(err.message)
      ? err.message
      : [err.message ?? 'Erro na requisição'];
    throw new ApiError(messages, res.status);
  }
  // DELETE (e outras rotas sem corpo) respondem 200/204 sem JSON —
  // res.json() lançaria SyntaxError em corpo vazio.
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>(path, token),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, token, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, token, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, token, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, token?: string) =>
    request<T>(path, token, { method: 'DELETE' }),
};

/** Só para teste: zera o token renovado e a renovação em voo entre casos. */
export function __resetApiAuthState() {
  browserToken = null;
  inFlightRefresh = null;
}
