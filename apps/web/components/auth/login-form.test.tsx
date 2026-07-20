import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './login-form';

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

/** Builds a fetch Response double with the given status and JSON body. */
function jsonResponse(ok: boolean, body: unknown) {
  return { ok, json: async () => body } as Response;
}

describe('LoginForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should render the email and password fields when mounted', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('should show a required error and not call the API when email is empty', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail é obrigatório')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // The email format rule is enforced by the browser's native constraint
  // validation on `type="email"`, which blocks submission before react-hook-form
  // runs. So the guarantee to assert is that the request never leaves, not that
  // zod's "E-mail inválido" message renders — the user never reaches it.
  it('should not send the request when email is malformed', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const email = screen.getByLabelText('E-mail') as HTMLInputElement;
    await user.type(email, 'not-an-email');
    await user.type(screen.getByLabelText('Senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(email.validity.typeMismatch).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should reject a password shorter than six characters', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@bioinfood.com');
    await user.type(screen.getByLabelText('Senha'), '12345');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('A senha deve ter no mínimo 6 caracteres')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should post the credentials to the login endpoint when input is valid', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(true, { user: {} }));
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@bioinfood.com');
    await user.type(screen.getByLabelText('Senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@bioinfood.com', password: 'secret123' }),
      });
    });
  });

  it('should redirect to the projects page after a successful login', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(true, { user: { mustChangePassword: false } }),
    );
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@bioinfood.com');
    await user.type(screen.getByLabelText('Senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/projects'));
  });

  it('should redirect to the change-password page when the user must rotate the password', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(true, { user: { mustChangePassword: true } }),
    );
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@bioinfood.com');
    await user.type(screen.getByLabelText('Senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/change-password'));
  });

  it('should show the server message when the credentials are rejected', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(false, { message: 'Credenciais inválidas' }),
    );
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@bioinfood.com');
    await user.type(screen.getByLabelText('Senha'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Credenciais inválidas')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('should fall back to a generic message when the rejection carries no message', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(false, {}));
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@bioinfood.com');
    await user.type(screen.getByLabelText('Senha'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail ou senha inválidos')).toBeInTheDocument();
  });

  it('should surface an error message when the network request throws', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockRejectedValue(new Error('Failed to fetch'));
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@bioinfood.com');
    await user.type(screen.getByLabelText('Senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Failed to fetch')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('should disable the submit button while the request is in flight', async () => {
    const user = userEvent.setup();
    let resolveRequest: (value: Response) => void = () => {};
    vi.mocked(global.fetch).mockReturnValue(
      new Promise<Response>((resolve) => { resolveRequest = resolve; }),
    );
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@bioinfood.com');
    await user.type(screen.getByLabelText('Senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const submitting = await screen.findByRole('button', { name: 'Entrando...' });
    expect(submitting).toBeDisabled();

    resolveRequest(jsonResponse(true, { user: {} }));
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });
});
