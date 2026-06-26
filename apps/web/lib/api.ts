const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BFF_URL =
  typeof window !== 'undefined'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL?.replace('3001', '3000') ?? 'http://localhost:3000');

async function refreshTokens(): Promise<boolean> {
  try {
    const res = await fetch(`${BFF_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (res.status === 401 && !retried) {
    const refreshed = await refreshTokens();
    if (!refreshed) {
      if (typeof window !== 'undefined') window.location.href = '/';
      throw new Error('Sessão expirada');
    }
    // O cookie foi renovado — repete a request com o novo token via cookie
    return request<T>(path, options, true);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Erro na requisição');
  }
  return res.json();
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} }),
};
