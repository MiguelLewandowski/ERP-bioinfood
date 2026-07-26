import { describe, it, expect, vi, afterEach } from 'vitest';
import { decodeSession, isUsable } from './auth';

function jwt(payload: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

const AGORA = 1_800_000_000; // instante fixo, em segundos

afterEach(() => vi.useRealTimers());

function congelaEm(segundos: number) {
  vi.useFakeTimers();
  vi.setSystemTime(segundos * 1000);
}

describe('decodeSession', () => {
  it('should read the identity and the expiry from the token', () => {
    const token = jwt({ sub: 'u1', email: 'admin@bioinfood.com', role: 'ADMIN', exp: AGORA });

    expect(decodeSession(token)).toEqual({
      sub: 'u1',
      email: 'admin@bioinfood.com',
      role: 'ADMIN',
      exp: AGORA,
    });
  });

  it('should return null when the token is not a readable JWT', () => {
    expect(decodeSession('nao-e-um-jwt')).toBeNull();
    expect(decodeSession('a.b.c')).toBeNull();
  });

  it('should return null when the payload has no subject', () => {
    expect(decodeSession(jwt({ email: 'x@y.com' }))).toBeNull();
  });
});

describe('isUsable', () => {
  // O bug: um token vencido cujo cookie ainda existe era tratado como válido. O
  // RSC renderizava, chamava a API e tomava 401 — e no servidor não há retry.
  it('should reject a token that already expired', () => {
    congelaEm(AGORA);

    expect(isUsable(AGORA - 1)).toBe(false);
  });

  it('should reject a token that expires inside the safety margin', () => {
    congelaEm(AGORA);

    // Ainda "válido", mas morre antes de o RSC terminar de renderizar.
    expect(isUsable(AGORA + 30)).toBe(false);
  });

  it('should accept a token with comfortable time left', () => {
    congelaEm(AGORA);

    expect(isUsable(AGORA + 15 * 60)).toBe(true);
  });

  it('should let the API decide when the token carries no expiry', () => {
    congelaEm(AGORA);

    expect(isUsable(undefined)).toBe(true);
  });
});
