import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { UserDto } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import UserDialog from './user-dialog';

const createMock = vi.fn();
const updateMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  usersApi: {
    create: (...args: unknown[]) => createMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
  },
}));

const EXISTING_USER = {
  id: 'user-7',
  name: 'Bruno Lima',
  email: 'bruno@bioinfood.com',
  role: 'PADRAO',
  isActive: true,
} as UserDto;

function setup(props: Partial<React.ComponentProps<typeof UserDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  const view = renderWithProviders(
    <UserDialog open onOpenChange={onOpenChange} onSaved={onSaved} {...props} />,
  );
  return { onOpenChange, onSaved, ...view };
}

describe('UserDialog — create mode', () => {
  beforeEach(() => {
    createMock.mockResolvedValue({ id: 'new-user' });
  });

  it('should render the create title and password field when no user is given', () => {
    setup();

    expect(screen.getByText('Novo Usuário')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha temporária *')).toBeInTheDocument();
  });

  it('should require name, email and password before calling the API', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Criar Usuário' }));

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('E-mail é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('A senha deve ter no mínimo 6 caracteres')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should reject a temporary password shorter than six characters', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Nome *'), 'Carla Dias');
    await user.type(screen.getByLabelText('E-mail *'), 'carla@bioinfood.com');
    await user.type(screen.getByLabelText('Senha temporária *'), '12345');
    await user.click(screen.getByRole('button', { name: 'Criar Usuário' }));

    expect(await screen.findByText('A senha deve ter no mínimo 6 caracteres')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should default the role to PADRAO, the standard internal profile', () => {
    setup();

    expect(screen.getByLabelText('Perfil de acesso')).toHaveValue('PADRAO');
  });

  it('should create the user with the selected role and the auth token', async () => {
    const user = userEvent.setup();
    const { onSaved } = setup();

    await user.type(screen.getByLabelText('Nome *'), 'Carla Dias');
    await user.type(screen.getByLabelText('E-mail *'), 'carla@bioinfood.com');
    await user.type(screen.getByLabelText('Senha temporária *'), 'temp1234');
    await user.selectOptions(screen.getByLabelText('Perfil de acesso'), 'ADMIN');
    await user.click(screen.getByRole('button', { name: 'Criar Usuário' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        {
          name: 'Carla Dias',
          email: 'carla@bioinfood.com',
          password: 'temp1234',
          role: 'ADMIN',
        },
        TEST_TOKEN,
      );
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('should show the server message and not report success when creation fails', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError(['E-mail já cadastrado'], 409));
    const { onSaved } = setup();

    await user.type(screen.getByLabelText('Nome *'), 'Carla Dias');
    await user.type(screen.getByLabelText('E-mail *'), 'carla@bioinfood.com');
    await user.type(screen.getByLabelText('Senha temporária *'), 'temp1234');
    await user.click(screen.getByRole('button', { name: 'Criar Usuário' }));

    expect(await screen.findByText('E-mail já cadastrado')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('UserDialog — edit mode', () => {
  beforeEach(() => {
    updateMock.mockResolvedValue({ id: 'user-7' });
  });

  it('should prefill the form with the selected user', () => {
    setup({ user: EXISTING_USER });

    expect(screen.getByText('Editar Usuário')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome *')).toHaveValue('Bruno Lima');
    expect(screen.getByLabelText('Perfil de acesso')).toHaveValue('PADRAO');
  });

  it('should not offer a password field when editing', () => {
    setup({ user: EXISTING_USER });

    expect(screen.queryByLabelText('Senha temporária *')).not.toBeInTheDocument();
  });

  it('should show the email as read-only so the login identity cannot be changed', () => {
    setup({ user: EXISTING_USER });

    const email = screen.getByLabelText('E-mail');
    expect(email).toHaveValue('bruno@bioinfood.com');
    expect(email).toBeDisabled();
  });

  it('should refresh the fields when a different user is selected while mounted', () => {
    const { rerender } = setup({ user: EXISTING_USER });
    expect(screen.getByLabelText('Nome *')).toHaveValue('Bruno Lima');

    const otherUser = {
      id: 'user-9', name: 'Diana Reis', email: 'diana@bioinfood.com',
      role: 'PADRAO', isActive: false,
    } as UserDto;
    rerender(
      <UserDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} user={otherUser} />,
    );

    expect(screen.getByLabelText('Nome *')).toHaveValue('Diana Reis');
    expect(screen.getByLabelText('Perfil de acesso')).toHaveValue('PADRAO');
  });

  it('should update the user with the changed role and active flag', async () => {
    const user = userEvent.setup();
    const { onSaved } = setup({ user: EXISTING_USER });

    await user.selectOptions(screen.getByLabelText('Perfil de acesso'), 'PADRAO');
    await user.click(screen.getByLabelText('Usuário ativo'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        'user-7',
        { name: 'Bruno Lima', role: 'PADRAO', isActive: false },
        TEST_TOKEN,
      );
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('should require a name when the field is cleared', async () => {
    const user = userEvent.setup();
    setup({ user: EXISTING_USER });

    await user.clear(screen.getByLabelText('Nome *'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should show the server message when the update is forbidden', async () => {
    const user = userEvent.setup();
    updateMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    const { onSaved } = setup({ user: EXISTING_USER });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Forbidden resource')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
