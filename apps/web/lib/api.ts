import { ApiError } from './errors';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const isBrowser = () => typeof window !== 'undefined';

/**
 * No navegador, tudo passa pelo proxy da própria origem (`/api/proxy/...`), que
 * lê o cookie httpOnly no servidor e anexa o `Bearer`. O token NUNCA chega ao
 * JS da página. No servidor (RSC), a chamada vai direta à API com o token que a
 * página leu do cookie.
 */
function baseUrl(): string {
  return isBrowser() ? '/api/proxy' : API_URL;
}

/**
 * Uma renovação por vez.
 *
 * O refresh do backend é de uso único — `refresh.use-case.ts` revoga o jti atual
 * e emite outro. Com N chamadas paralelas expirando juntas (o dashboard dispara
 * 5), a primeira renova e as outras chegam com o jti já revogado, recebem 401 e
 * mandam o usuário para o login. Compartilhar a mesma promise mata a corrida.
 *
 * Desde a detecção de reuso no backend, essa corrida deixou de ser só um
 * incômodo: o segundo uso do mesmo jti é tratado como roubo e derruba TODAS as
 * sessões do usuário. O single-flight é o que impede o falso positivo.
 */
let inFlightRefresh: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  inFlightRefresh ??= doRefresh().finally(() => { inFlightRefresh = null; });
  return inFlightRefresh;
}

async function request<T>(
  path: string,
  token?: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const browser = isBrowser();

  const res = await fetch(`${baseUrl()}${path}`, {
    ...options,
    // Mesma origem no browser: o cookie httpOnly vai sozinho e o proxy converte
    // em `Bearer`. O token só entra no header no caminho servidor (RSC).
    ...(browser ? { credentials: 'same-origin' as const } : {}),
    headers: {
      'Content-Type': 'application/json',
      ...(!browser && token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // No servidor não há o que renovar: o proxy de navegação já trocou os cookies
  // antes do render, e daqui não sai cookie nenhum.
  if (res.status === 401 && !retried && browser) {
    const refreshed = await refreshOnce();
    if (!refreshed) {
      window.location.href = '/';
      throw new ApiError(['Sessão expirada'], 401);
    }
    // Refaz a chamada: o cookie já foi trocado, então o proxy pega o token novo.
    return request<T>(path, token, options, true);
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
  inFlightRefresh = null;
}
