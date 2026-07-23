import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, __resetApiAuthState } from './api';
import { ApiError } from './errors';

const API = 'http://localhost:3001';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

function unauthorized(): Response {
  return {
    ok: false,
    status: 401,
    text: async () => '{"message":"Unauthorized"}',
    json: async () => ({ message: 'Unauthorized' }),
  } as unknown as Response;
}

function authHeaderOf(call: unknown[]): string | undefined {
  return (call[1] as { headers: Record<string, string> }).headers.Authorization;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  __resetApiAuthState();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  // window.location.href = '/' derruba o jsdom com "Not implemented: navigation".
  Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
});

afterEach(() => vi.unstubAllGlobals());

describe('api — renovação de sessão', () => {
  it('should send the token it was given while it still works', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'p1' }));

    await api.get('/projects/p1', 'token-bom');

    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe('Bearer token-bom');
  });

  // O bug: a repetição reenviava o header antigo, então tomava 401 de novo.
  // A API autentica por `Bearer`, e o cookie renovado é de outra origem (:3000).
  it('should retry with the refreshed token, not the expired one', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'token-novo' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'p1' }));

    const result = await api.get('/projects/p1', 'token-velho');

    expect(result).toEqual({ id: 'p1' });
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe('Bearer token-velho');
    expect(fetchMock.mock.calls[1][0]).toContain('/api/auth/refresh');
    expect(authHeaderOf(fetchMock.mock.calls[2])).toBe('Bearer token-novo');
  });

  // O AuthProvider entrega o token congelado no render; depois de renovar, o
  // valor novo tem que valer para as chamadas seguintes.
  it('should keep using the refreshed token on later calls', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'token-novo' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'p1' }))
      .mockResolvedValueOnce(jsonResponse({ id: 't1' }));

    await api.get('/projects/p1', 'token-velho');
    await api.get('/tasks/t1', 'token-velho');

    expect(authHeaderOf(fetchMock.mock.calls[3])).toBe('Bearer token-novo');
  });

  // O refresh do backend é de uso único: a segunda chamada com o mesmo jti
  // recebe "token revogado" e derruba a sessão. Uma renovação só para todas.
  it('should refresh only once when several calls expire together', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/auth/refresh')) {
        return Promise.resolve(jsonResponse({ ok: true, accessToken: 'token-novo' }));
      }
      const header = 'Bearer token-velho';
      const calls = fetchMock.mock.calls;
      const current = calls[calls.length - 1];
      return Promise.resolve(
        authHeaderOf(current) === header ? unauthorized() : jsonResponse({ ok: true }),
      );
    });

    await Promise.all([
      api.get('/a', 'token-velho'),
      api.get('/b', 'token-velho'),
      api.get('/c', 'token-velho'),
      api.get('/d', 'token-velho'),
      api.get('/e', 'token-velho'),
    ]);

    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/api/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('should send the user to the login screen when the refresh is rejected', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized());

    await expect(api.get('/projects/p1', 'token-velho')).rejects.toThrow(ApiError);
    expect(window.location.href).toBe('/');
  });

  it('should not retry more than once', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'token-novo' }))
      .mockResolvedValueOnce(unauthorized());

    await expect(api.get('/projects/p1', 'token-velho')).rejects.toThrow(ApiError);
    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/api/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('should not attach an Authorization header when there is no token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await api.post('/auth/login', { email: 'a@b.com' });

    expect(authHeaderOf(fetchMock.mock.calls[0])).toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe(`${API}/auth/login`);
  });
});
