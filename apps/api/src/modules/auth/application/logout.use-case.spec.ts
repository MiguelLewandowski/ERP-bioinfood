import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogoutUseCase } from './logout.use-case';
import { IAuthRepository } from '../domain/auth.repository';
import { ITokenService } from '../domain/token.service';

function makeRepo() {
  return {
    revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
    revokeAllForUser: vi.fn().mockResolvedValue(2),
  } as unknown as IAuthRepository;
}

function makeTokens(overrides: Partial<ITokenService> = {}) {
  return {
    verifyRefresh: vi.fn().mockReturnValue({ sub: 'user-1', email: 'a@b.com', role: 'PADRAO', jti: 'jti-1' }),
    ...overrides,
  } as unknown as ITokenService;
}

describe('LogoutUseCase', () => {
  let repo: IAuthRepository;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new LogoutUseCase(repo, makeTokens());
  });

  // Antes, sair só apagava o cookie do navegador e o refresh token seguia
  // válido por até 7 dias — quem tivesse uma cópia continuava com a sessão.
  it('should revoke the refresh token of the session that is leaving', async () => {
    await useCase.execute('refresh-atual');

    expect(repo.revokeRefreshToken).toHaveBeenCalledWith('jti-1');
    expect(repo.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('should revoke every session when logging out of all devices', async () => {
    await useCase.execute('refresh-atual', true);

    expect(repo.revokeAllForUser).toHaveBeenCalledWith('user-1');
    expect(repo.revokeRefreshToken).not.toHaveBeenCalled();
  });

  it('should do nothing when there is no refresh token', async () => {
    await useCase.execute(undefined);

    expect(repo.revokeRefreshToken).not.toHaveBeenCalled();
  });

  // Sair não pode falhar: o cliente apaga os cookies de qualquer forma, e um
  // erro aqui prenderia o usuário numa sessão que ele quer encerrar.
  it('should not throw when the refresh token is invalid', async () => {
    useCase = new LogoutUseCase(repo, makeTokens({
      verifyRefresh: vi.fn().mockImplementation(() => { throw new Error('inválido'); }),
    }));

    await expect(useCase.execute('token-corrompido')).resolves.toBeUndefined();
  });
});
