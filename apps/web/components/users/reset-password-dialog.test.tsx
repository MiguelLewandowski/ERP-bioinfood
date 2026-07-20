import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { UserDto } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import ResetPasswordDialog from './reset-password-dialog';

const resetPasswordMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  usersApi: {
    resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccessMock(...args) },
}));

const TARGET_USER = {
  id: 'user-42',
  name: 'Ana Souza',
  email: 'ana@bioinfood.com',
  role: 'INSERE',
  isActive: true,
} as UserDto;

function setup(overrides: Partial<React.ComponentProps<typeof ResetPasswordDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onReset = vi.fn();
  renderWithProviders(
    <ResetPasswordDialog
      open
      onOpenChange={onOpenChange}
      user={TARGET_USER}
      onReset={onReset}
      {...overrides}
    />,
  );
  return { onOpenChange, onReset };
}

describe('ResetPasswordDialog', () => {
  beforeEach(() => {
    resetPasswordMock.mockResolvedValue(undefined);
  });

  it('should name the target user in the title when opened', () => {
    setup();

    expect(screen.getByText('Resetar senha de Ana Souza')).toBeInTheDocument();
  });

  it('should reject a password shorter than six characters', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Nova senha temporária *'), '12345');
    await user.type(screen.getByLabelText('Confirmar nova senha *'), '12345');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(await screen.findByText('A senha deve ter no mínimo 6 caracteres')).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it('should reject the submission when the confirmation does not match', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Nova senha temporária *'), 'tempsecret');
    await user.type(screen.getByLabelText('Confirmar nova senha *'), 'otherpass');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it('should reset the password for the selected user id with the auth token', async () => {
    const user = userEvent.setup();
    const { onReset } = setup();

    await user.type(screen.getByLabelText('Nova senha temporária *'), 'tempsecret');
    await user.type(screen.getByLabelText('Confirmar nova senha *'), 'tempsecret');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith('user-42', 'tempsecret', TEST_TOKEN);
    });
    expect(onReset).toHaveBeenCalled();
  });

  it('should warn that active sessions will be terminated', () => {
    setup();

    expect(
      screen.getByText(/desconectado de todas as sessões ativas/i),
    ).toBeInTheDocument();
  });

  it('should show a friendly message and not notify success when the API rejects', async () => {
    const user = userEvent.setup();
    resetPasswordMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    const { onReset } = setup();

    await user.type(screen.getByLabelText('Nova senha temporária *'), 'tempsecret');
    await user.type(screen.getByLabelText('Confirmar nova senha *'), 'tempsecret');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(await screen.findByText('Forbidden resource')).toBeInTheDocument();
    expect(onReset).not.toHaveBeenCalled();
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it('should close without calling the API when cancel is pressed', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });
});
