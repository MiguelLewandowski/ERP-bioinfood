import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshUseCase } from './refresh.use-case';
import { IAuthRepository } from '../domain/auth.repository';
import { ITokenService } from '../domain/token.service';

const PAYLOAD = { sub: 'user-1', email: 'a@b.com', role: 'PADRAO', jti: 'jti-atual' };

function makeRepo(overrides: Partial<IAuthRepository> = {}) {
  return {
    findRefreshToken: vi.fn().mockResolvedValue({ id: 'rt1', revokedAt: null }),
    findById: vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@b.com', role: 'PADRAO', isActive: true }),
    revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
    revokeAllForUser: vi.fn().mockResolvedValue(3),
    saveRefreshToken: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IAuthRepository;
}

function makeTokens(overrides: Partial<ITokenService> = {}) {
  return {
    verifyRefresh: vi.fn().mockReturnValue(PAYLOAD),
    generatePair: vi.fn().mockReturnValue({
      accessToken: 'access-novo',
      refreshToken: 'refresh-novo',
      jti: 'jti-novo',
      expiresAt: new Date('2026-08-01'),
    }),
    ...overrides,
  } as unknown as ITokenService;
}

describe('RefreshUseCase', () => {
  let repo: IAuthRepository;
  let tokens: ITokenService;
  let useCase: RefreshUseCase;

  beforeEach(() => {
    repo = makeRepo();
    tokens = makeTokens();
    useCase = new RefreshUseCase(repo, tokens);
  });

  it('should rotate the refresh token, revoking the one just used', async () => {
    const result = await useCase.execute('refresh-atual');

    expect(repo.revokeRefreshToken).toHaveBeenCalledWith('jti-atual');
    expect(repo.saveRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', jti: 'jti-novo' }),
    );
    expect(result.accessToken).toBe('access-novo');
  });

  // Refresh é de uso único: reaparecer revogado significa que existem duas
  // cópias em circulação. Como não dá para saber qual é a legítima, derruba tudo.
  it('should revoke every session when a revoked token is presented again', async () => {
    repo = makeRepo({
      findRefreshToken: vi.fn().mockResolvedValue({ id: 'rt1', revokedAt: new Date('2026-07-20') }),
    });
    useCase = new RefreshUseCase(repo, makeTokens());

    await expect(useCase.execute('refresh-roubado')).rejects.toThrow(UnauthorizedException);
    expect(repo.revokeAllForUser).toHaveBeenCalledWith('user-1');
  });

  it('should not issue a new pair when reuse is detected', async () => {
    repo = makeRepo({
      findRefreshToken: vi.fn().mockResolvedValue({ id: 'rt1', revokedAt: new Date('2026-07-20') }),
    });
    tokens = makeTokens();
    useCase = new RefreshUseCase(repo, tokens);

    await expect(useCase.execute('refresh-roubado')).rejects.toThrow();
    expect(tokens.generatePair).not.toHaveBeenCalled();
    expect(repo.saveRefreshToken).not.toHaveBeenCalled();
  });

  it('should reject a token that was never stored', async () => {
    repo = makeRepo({ findRefreshToken: vi.fn().mockResolvedValue(null) });
    useCase = new RefreshUseCase(repo, makeTokens());

    await expect(useCase.execute('desconhecido')).rejects.toThrow(UnauthorizedException);
    expect(repo.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('should reject and revoke when the user was deactivated', async () => {
    repo = makeRepo({
      findById: vi.fn().mockResolvedValue({ id: 'user-1', isActive: false }),
    });
    useCase = new RefreshUseCase(repo, makeTokens());

    await expect(useCase.execute('refresh-atual')).rejects.toThrow(UnauthorizedException);
    expect(repo.revokeRefreshToken).toHaveBeenCalledWith('jti-atual');
  });

  it('should reject a refresh token without a jti', async () => {
    useCase = new RefreshUseCase(makeRepo(), makeTokens({
      verifyRefresh: vi.fn().mockReturnValue({ ...PAYLOAD, jti: undefined }),
    }));

    await expect(useCase.execute('sem-jti')).rejects.toThrow(UnauthorizedException);
  });
});
