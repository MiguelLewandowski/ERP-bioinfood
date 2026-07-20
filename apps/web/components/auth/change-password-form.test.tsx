import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChangePasswordForm from './change-password-form';

const pushMock = vi.fn();
const refreshMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccessMock(...args) },
}));

function jsonResponse(ok: boolean, body: unknown) {
  return { ok, json: async () => body } as Response;
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  values: { current: string; next: string; confirm: string },
) {
  await user.type(screen.getByLabelText('Senha atual'), values.current);
  await user.type(screen.getByLabelText('Nova senha'), values.next);
  await user.type(screen.getByLabelText('Confirmar nova senha'), values.confirm);
}

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should render all three password fields when mounted', () => {
    render(<ChangePasswordForm forced={false} />);

    expect(screen.getByLabelText('Senha atual')).toBeInTheDocument();
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument();
  });

  it('should label the submit button differently when the change is forced', () => {
    const { unmount } = render(<ChangePasswordForm forced />);
    expect(screen.getByRole('button', { name: 'Definir nova senha' })).toBeInTheDocument();
    unmount();

    render(<ChangePasswordForm forced={false} />);
    expect(screen.getByRole('button', { name: 'Salvar nova senha' })).toBeInTheDocument();
  });

  it('should require the current password', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm forced={false} />);

    await user.type(screen.getByLabelText('Nova senha'), 'newsecret');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'newsecret');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(await screen.findByText('Senha atual é obrigatória')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should reject a new password shorter than six characters', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm forced={false} />);

    await fillForm(user, { current: 'oldsecret', next: '12345', confirm: '12345' });
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(await screen.findByText('A nova senha deve ter no mínimo 6 caracteres')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should reject the submission when the confirmation does not match', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm forced={false} />);

    await fillForm(user, { current: 'oldsecret', next: 'newsecret', confirm: 'different' });
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should send only the current and new password, never the confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(true, {}));
    render(<ChangePasswordForm forced={false} />);

    await fillForm(user, { current: 'oldsecret', next: 'newsecret', confirm: 'newsecret' });
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: 'oldsecret', newPassword: 'newsecret' }),
      });
    });
  });

  it('should confirm and redirect to projects after a successful change', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(true, {}));
    render(<ChangePasswordForm forced={false} />);

    await fillForm(user, { current: 'oldsecret', next: 'newsecret', confirm: 'newsecret' });
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith('Senha alterada com sucesso'));
    expect(pushMock).toHaveBeenCalledWith('/projects');
  });

  it('should show the server message when the current password is wrong', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(false, { message: 'Senha atual incorreta' }),
    );
    render(<ChangePasswordForm forced={false} />);

    await fillForm(user, { current: 'wrongpass', next: 'newsecret', confirm: 'newsecret' });
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(await screen.findByText('Senha atual incorreta')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('should fall back to a generic message when the rejection carries no message', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(false, {}));
    render(<ChangePasswordForm forced={false} />);

    await fillForm(user, { current: 'oldsecret', next: 'newsecret', confirm: 'newsecret' });
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(await screen.findByText('Não foi possível trocar a senha')).toBeInTheDocument();
  });

  it('should surface an error and stay on the page when the network fails', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockRejectedValue(new Error('Failed to fetch'));
    render(<ChangePasswordForm forced={false} />);

    await fillForm(user, { current: 'oldsecret', next: 'newsecret', confirm: 'newsecret' });
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(await screen.findByText('Failed to fetch')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
