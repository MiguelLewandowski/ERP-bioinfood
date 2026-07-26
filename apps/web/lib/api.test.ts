import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, __resetApiAuthState } from './api';
import { ApiError } from './errors';

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

function initOf(call: unknown[]): RequestInit & { headers: Record<string, string> } {
  return call[1] as RequestInit & { headers: Record<string, string> };
}

function isRefresh(call: unknown[]): boolean {
  return String(call[0]).includes('/api/auth/refresh');
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

// O ponto da mudança: no navegador o access token não circula mais. A chamada
// vai para a mesma origem levando só o cookie httpOnly, e /api/proxy converte
// em `Bearer` no servidor — um XSS não tem token para roubar.
describe('api — no navegador', () => {
  it('should call the same-origin proxy instead of the API host', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'p1' }));

    await api.get('/projects/p1', 'token-que-deve-ser-ignorado');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/proxy/projects/p1');
  });

  it('should never put the token in the Authorization header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'p1' }));

    await api.get('/projects/p1', 'token-que-deve-ser-ignorado');

    expect(initOf(fetchMock.mock.calls[0]).headers.Authorization).toBeUndefined();
  });

  it('should send the session cookie with the request', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'p1' }));

    await api.get('/projects/p1');

    expect(initOf(fetchMock.mock.calls[0]).credentials).toBe('same-origin');
  });

  it('should forward the method and body untouched', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await api.post('/pops', { title: 'Nova' });

    const init = initOf(fetchMock.mock.calls[0]);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ title: 'Nova' }));
  });
});

describe('api — renovação de sessão', () => {
  it('should refresh and retry once when the cookie has expired', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ id: 'p1' }));

    const result = await api.get('/projects/p1');

    expect(result).toEqual({ id: 'p1' });
    expect(isRefresh(fetchMock.mock.calls[1])).toBe(true);
    expect(fetchMock.mock.calls[2][0]).toBe('/api/proxy/projects/p1');
  });

  // O refresh do backend é de uso único E agora trata reuso como roubo,
  // derrubando todas as sessões. Duas renovações concorrentes seriam um falso
  // positivo que desloga o usuário de tudo — o single-flight é o que impede.
  it('should refresh only once when several calls expire together', async () => {
    let refreshed = false;
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/api/auth/refresh')) {
        refreshed = true;
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(refreshed ? jsonResponse({ ok: true }) : unauthorized());
    });

    await Promise.all([
      api.get('/a'), api.get('/b'), api.get('/c'), api.get('/d'), api.get('/e'),
    ]);

    expect(fetchMock.mock.calls.filter(isRefresh)).toHaveLength(1);
  });

  it('should send the user to the login screen when the refresh is rejected', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized());

    await expect(api.get('/projects/p1')).rejects.toThrow(ApiError);
    expect(window.location.href).toBe('/');
  });

  it('should not retry more than once', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(unauthorized());

    await expect(api.get('/projects/p1')).rejects.toThrow(ApiError);
    expect(fetchMock.mock.calls.filter(isRefresh)).toHaveLength(1);
  });

  // Derrubar a sessão porque a API piscou é perda de trabalho sem motivo: os
  // cookies continuam válidos, só não deu para falar com o servidor.
  it('should keep the session when the refresh fails from unavailability', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => '' } as unknown as Response);

    await expect(api.get('/projects/p1')).rejects.toThrow(/indisponível/i);
    expect(window.location.href).toBe('');
  });

  it('should send the user to the login screen only when the refresh is rejected', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized());

    await expect(api.get('/projects/p1')).rejects.toThrow(ApiError);
    expect(window.location.href).toBe('/');
  });

  it('should surface the validation messages the API returned', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: ['Título é obrigatório'] }, 400));

    await expect(api.post('/pops', {})).rejects.toThrow('Título é obrigatório');
  });

  // O middleware redirecionava as chamadas de /api/proxy para a tela de login; o
  // fetch seguia o 307 e entregava HTML com status 200. O JSON.parse cru
  // estourava com "Unexpected token '<'", que não ajuda ninguém a entender que a
  // sessão caiu.
  it('should raise a readable error when a 2xx response is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<!DOCTYPE html><html lang="pt-BR"><body>login</body></html>',
    } as unknown as Response);

    await expect(api.get('/organizations/enrich/00000000000191')).rejects.toThrow(ApiError);
    await expect(api.get('/organizations/enrich/00000000000191')).rejects.toThrow(/Resposta inesperada/);
  });
});
