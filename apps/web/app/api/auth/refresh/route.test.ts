// @vitest-environment node
// NextRequest/NextResponse são APIs de servidor — jsdom não as atende.

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

/**
 * Estes testes cobrem o salto **BFF → API**, que não tinha cobertura nenhuma.
 *
 * O teste de `lib/api.test.ts` mocka esta rota devolvendo `{ ok: true }` — ou
 * seja, exercita só o salto navegador → BFF e confirma a suposição do próprio
 * BFF. Foi por isso que a divergência de shape (a API devolve o par achatado,
 * o BFF lia `data.tokens`) passou batido e derrubou a sessão a cada 15min.
 *
 * Regra que estes testes materializam: o upstream é mockado com o shape **real**
 * da API, não com o shape que o BFF gostaria de receber.
 */

const API_URL = 'http://api.test';

function makeRequest(refreshToken?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/refresh', {
    method: 'POST',
    headers: refreshToken ? { cookie: `refresh_token=${refreshToken}` } : {},
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = API_URL;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/auth/refresh', () => {
  // O caso que quebrava em produção: é EXATAMENTE isto que a API devolve hoje
  // (RefreshUseCase.execute → { accessToken, refreshToken }, sem envelope).
  it('should renew the session when the API returns the flat token pair', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ accessToken: 'access-novo', refreshToken: 'refresh-novo' }),
    );

    const res = await POST(makeRequest('rt-achatado'));

    expect(res.status).toBe(200);
    expect(res.cookies.get('access_token')?.value).toBe('access-novo');
    expect(res.cookies.get('refresh_token')?.value).toBe('refresh-novo');
  });

  // Tolerância deliberada: se um dia a API normalizar para o shape do /auth/login,
  // a rota continua funcionando e o deploy dos dois lados deixa de ser acoplado.
  it('should renew the session when the API returns the pair wrapped in tokens', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ tokens: { accessToken: 'access-env', refreshToken: 'refresh-env' } }),
    );

    const res = await POST(makeRequest('rt-envelopado'));

    expect(res.status).toBe(200);
    expect(res.cookies.get('access_token')?.value).toBe('access-env');
    expect(res.cookies.get('refresh_token')?.value).toBe('refresh-env');
  });

  it('should forward the cookie refresh token to the API', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ accessToken: 'a', refreshToken: 'b' }),
    );

    await POST(makeRequest('rt-encaminhado'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/auth/refresh`);
    expect(JSON.parse(init.body)).toEqual({ refreshToken: 'rt-encaminhado' });
  });

  it('should return 401 and clear the cookies when the API rejects the refresh', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Token revogado' }, 401));

    const res = await POST(makeRequest('rt-revogado'));

    expect(res.status).toBe(401);
    expect(res.cookies.get('access_token')?.value).toBe('');
    expect(res.cookies.get('refresh_token')?.value).toBe('');
  });

  // Um 200 com corpo inesperado não pode virar cookie vazio: sem os dois campos
  // a sessão não foi renovada, e fingir que foi quebra na chamada seguinte.
  it('should return 401 when the API answers 200 with an unexpected body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ accessToken: 'so-o-access' }));

    const res = await POST(makeRequest('rt-incompleto'));

    expect(res.status).toBe(401);
  });

  // Indisponibilidade não é sessão inválida: apagar o cookie aqui derrubaria o
  // usuário por causa de um deploy da API.
  it('should keep the cookies when the API is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await POST(makeRequest('rt-api-fora'));

    expect(res.status).toBe(503);
    expect(res.cookies.get('access_token')).toBeUndefined();
    expect(res.cookies.get('refresh_token')).toBeUndefined();
  });

  it('should return 401 without calling the API when there is no refresh token', async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // O refresh é rotativo de uso único e o backend trata reuso como roubo,
  // revogando TODAS as sessões. Duas abas renovando juntas precisam virar uma
  // chamada só — senão a correção do shape só troca um logout por outro.
  it('should call the API once when two requests share the same refresh token', async () => {
    fetchMock.mockImplementation(
      () => new Promise((resolve) =>
        setTimeout(() => resolve(jsonResponse({ accessToken: 'a', refreshToken: 'b' })), 10),
      ),
    );

    const [res1, res2] = await Promise.all([
      POST(makeRequest('rt-concorrente')),
      POST(makeRequest('rt-concorrente')),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });
});
